import base64
import datetime
import io
import secrets

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/share", tags=["share"])


@router.post("/create")
def create_share_link(payload: schemas.ShareCreate, db: Session = Depends(get_db),
                       user: models.User = Depends(get_current_user)):
    # Invalidate any existing link for this resource by this user
    existing_link = db.query(models.ShareLink).filter(
        models.ShareLink.owner_id == user.id,
        models.ShareLink.resource_type == payload.resource_type,
        models.ShareLink.resource_id == payload.resource_id
    ).first()
    
    if existing_link:
        if existing_link.chat_session_id:
            old_chat = db.query(models.ChatSession).filter(models.ChatSession.id == existing_link.chat_session_id).first()
            if old_chat:
                db.delete(old_chat)
        db.delete(existing_link)
        db.flush()

    token = secrets.token_urlsafe(12)
    expires_at = None
    if payload.expires_in_days:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=payload.expires_in_days)

    chat_session_id = None
    if payload.access_level == "read_write":
        # Create a linked chat session for this shared resource
        chat_title = f"Shared {payload.resource_type} ({payload.resource_id[:8]})"
        chat_session = models.ChatSession(
            user_id=user.id,
            title=chat_title,
            document_ids=[payload.resource_id] if payload.resource_type == "document" else []
        )
        db.add(chat_session)
        db.flush()
        chat_session_id = chat_session.id

    link = models.ShareLink(
        owner_id=user.id,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        access_level=payload.access_level,
        chat_session_id=chat_session_id,
        is_one_time=payload.is_one_time,
        token=token,
        expires_at=expires_at,
    )
    db.add(link)
    db.commit()

    # Generate absolute URL if base_url is provided, else fallback to relative
    full_url = f"{payload.base_url.rstrip('/')}/share/{token}" if payload.base_url else f"/share/{token}"
    qr_b64 = _make_qr_base64(full_url)
    return {
        "token": token, 
        "share_url": f"/share/{token}", 
        "qr_code_base64": qr_b64, 
        "expires_at": expires_at,
        "access_level": link.access_level
    }


@router.get("/{token}")
def resolve_share_link(token: str, db: Session = Depends(get_db)):
    link = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    if link.expires_at and link.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")

    if link.resource_type == "note":
        note = db.query(models.Note).filter(models.Note.id == link.resource_id).first()
        return {
            "type": "note", 
            "title": note.title, 
            "content": note.content,
            "access_level": link.access_level,
            "chat_session_id": link.chat_session_id,
            "is_one_time": link.is_one_time
        } if note else {}
    if link.resource_type == "document":
        doc = db.query(models.Document).filter(models.Document.id == link.resource_id).first()
        return {
            "type": "document", 
            "title": doc.title, 
            "summary": doc.summary,
            "access_level": link.access_level,
            "chat_session_id": link.chat_session_id,
            "is_one_time": link.is_one_time
        } if doc else {}
    if link.resource_type == "quiz":
        quiz = db.query(models.Quiz).filter(models.Quiz.id == link.resource_id).first()
        return {
            "type": "quiz", 
            "title": quiz.title, 
            "questions": quiz.questions,
            "access_level": link.access_level,
            "chat_session_id": link.chat_session_id,
            "is_one_time": link.is_one_time
        } if quiz else {}
    if link.resource_type == "subject":
        subject = db.query(models.Subject).filter(models.Subject.id == link.resource_id).first()
        if not subject:
            return {}
        docs = db.query(models.Document).filter(
            models.Document.subject_id == subject.id,
            models.Document.status == "indexed"
        ).all()
        return {
            "type": "subject", 
            "title": subject.name,
            "description": subject.description,
            "documents": [{"title": d.title, "summary": d.summary} for d in docs],
            "access_level": link.access_level,
            "chat_session_id": link.chat_session_id,
            "is_one_time": link.is_one_time
        }
    if link.resource_type == "revision_day":
        date_str = link.resource_id
        dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
        end_dt = dt + datetime.timedelta(days=1)
        docs = db.query(models.Document).join(models.Subject).filter(
            models.Subject.user_id == link.owner_id,
            models.Document.status == "indexed",
            models.Document.uploaded_at >= dt,
            models.Document.uploaded_at < end_dt
        ).all()
        return {
            "type": "revision_day",
            "title": f"Revision Notes for {date_str}",
            "documents": [{"title": d.title, "summary": d.summary} for d in docs],
            "access_level": link.access_level,
            "chat_session_id": link.chat_session_id,
            "is_one_time": link.is_one_time
        }
        
    return {
        "type": link.resource_type, 
        "resource_id": link.resource_id,
        "access_level": link.access_level,
        "chat_session_id": link.chat_session_id,
        "is_one_time": link.is_one_time
    }


def _make_qr_base64(data: str) -> str:
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@router.post("/{token}/consume")
def consume_share_link(token: str, db: Session = Depends(get_db)):
    link = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    if not link:
        return {"status": "ok"} # already consumed or not found
    if link.is_one_time:
        db.delete(link)
        db.commit()
    return {"status": "ok"}


@router.post("/{token}/duplicate")
def duplicate_shared_resource(token: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    link = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    # Create a "Shared Resources" subject if it doesn't exist
    subject = db.query(models.Subject).filter(models.Subject.user_id == user.id, models.Subject.name == "Shared Resources").first()
    if not subject:
        subject = models.Subject(user_id=user.id, name="Shared Resources", description="Items saved from shared links.")
        db.add(subject)
        db.flush()

    if link.resource_type == "note":
        old_note = db.query(models.Note).filter(models.Note.id == link.resource_id).first()
        if not old_note:
            raise HTTPException(status_code=404, detail="Note not found")
        # create a dummy document to attach the note to
        dummy_doc = models.Document(subject_id=subject.id, title=f"Shared: {old_note.title}", file_path="", status="indexed")
        db.add(dummy_doc)
        db.flush()
        new_note = models.Note(document_id=dummy_doc.id, title=old_note.title, content=old_note.content, key_terms=old_note.key_terms)
        db.add(new_note)

    elif link.resource_type == "document":
        old_doc = db.query(models.Document).filter(models.Document.id == link.resource_id).first()
        if not old_doc:
            raise HTTPException(status_code=404, detail="Document not found")
        new_doc = models.Document(
            subject_id=subject.id, title=old_doc.title, file_path=old_doc.file_path,
            file_type=old_doc.file_type, raw_text_path=old_doc.raw_text_path, summary=old_doc.summary, status=old_doc.status
        )
        db.add(new_doc)
        db.flush()
        # copy notes
        old_notes = db.query(models.Note).filter(models.Note.document_id == old_doc.id).all()
        for on in old_notes:
            db.add(models.Note(document_id=new_doc.id, title=on.title, content=on.content, key_terms=on.key_terms))

    elif link.resource_type == "subject":
        old_subject = db.query(models.Subject).filter(models.Subject.id == link.resource_id).first()
        if not old_subject:
             raise HTTPException(status_code=404, detail="Subject not found")
        new_subj = models.Subject(user_id=user.id, name=f"Shared: {old_subject.name}", description=old_subject.description)
        db.add(new_subj)
        db.flush()
        old_docs = db.query(models.Document).filter(models.Document.subject_id == old_subject.id).all()
        for od in old_docs:
            new_doc = models.Document(
                subject_id=new_subj.id, title=od.title, file_path=od.file_path,
                file_type=od.file_type, raw_text_path=od.raw_text_path, summary=od.summary, status=od.status
            )
            db.add(new_doc)
            db.flush()
            old_notes = db.query(models.Note).filter(models.Note.document_id == od.id).all()
            for on in old_notes:
                db.add(models.Note(document_id=new_doc.id, title=on.title, content=on.content, key_terms=on.key_terms))

    else:
        raise HTTPException(status_code=400, detail="Cannot duplicate this resource type")

    db.commit()
    return {"message": "Resource saved to your Library successfully."}
