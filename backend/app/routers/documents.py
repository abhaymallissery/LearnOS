import os
import shutil
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import get_current_user
from app.config import settings
from app.utils.text_extract import detect_file_type
from app.utils.url_extract import extract_text_from_url
from app.services.ingestion import process_document
from app.services.vectorstore import semantic_search, delete_document_vectors

router = APIRouter(prefix="/api", tags=["documents"])


# ---------- Subjects ----------
@router.post("/subjects", response_model=schemas.SubjectOut)
def create_subject(payload: schemas.SubjectCreate, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    subject = models.Subject(user_id=user.id, name=payload.name, description=payload.description)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def cleanup_document_relations(document_id: str, user_id: str, db: Session):
    # Delete related quizzes
    db.query(models.Quiz).filter(models.Quiz.document_id == document_id).delete(synchronize_session=False)
    
    # Delete related revision schedules
    db.query(models.RevisionSchedule).filter(models.RevisionSchedule.document_id == document_id).delete(synchronize_session=False)
    
    # Delete share links for this document
    db.query(models.ShareLink).filter(models.ShareLink.resource_id == document_id, models.ShareLink.resource_type == "document").delete(synchronize_session=False)

    # Clean up chat sessions
    sessions = db.query(models.ChatSession).filter(models.ChatSession.user_id == user_id).all()
    for s in sessions:
        if s.document_ids and document_id in s.document_ids:
            if len(s.document_ids) == 1:
                db.delete(s)
            else:
                s.document_ids = [did for did in s.document_ids if did != document_id]

@router.get("/subjects", response_model=list[schemas.SubjectOut])
def list_subjects(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Subject).filter(models.Subject.user_id == user.id).all()


@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: str, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id, models.Subject.user_id == user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    docs = db.query(models.Document).filter(models.Document.subject_id == subject_id).all()
    for doc in docs:
        cleanup_document_relations(doc.id, user.id, db)
        delete_document_vectors(doc.id)
        if doc.file_path and os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except Exception:
                pass
        db.delete(doc)
        
    db.delete(subject)
    db.commit()
    return {"deleted": True}


# ---------- Documents (personal library) ----------
@router.post("/documents/upload", response_model=schemas.DocumentOut)
def upload_document(
    background_tasks: BackgroundTasks,
    subject_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id, models.Subject.user_id == user.id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    file_type = detect_file_type(file.filename)
    if file_type not in ("pdf", "docx", "pptx", "txt", "md"):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_type}")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    doc_id = str(uuid.uuid4())
    saved_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_{file.filename}")
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc = models.Document(
        id=doc_id,
        subject_id=subject_id,
        title=file.filename,
        file_path=saved_path,
        file_type=file_type,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Runs the extract -> summarize -> smart-notes -> vector-index pipeline
    # in the background so the upload responds immediately.
    background_tasks.add_task(process_document, doc.id, db)
    return doc


@router.post("/documents/url", response_model=schemas.DocumentOut)
def upload_url_document(
    payload: schemas.DocumentUrlCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    subject = db.query(models.Subject).filter(
        models.Subject.id == payload.subject_id, models.Subject.user_id == user.id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    try:
        text_content = extract_text_from_url(payload.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    doc_id = str(uuid.uuid4())
    saved_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_url.txt")
    
    with open(saved_path, "w", encoding="utf-8") as f:
        f.write(text_content)

    doc = models.Document(
        id=doc_id,
        subject_id=payload.subject_id,
        title=payload.url[:50] + "..." if len(payload.url) > 50 else payload.url,
        file_path=saved_path,
        file_type="txt", # We save it as text, so ingestion pipeline can process it naturally
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Note: process_document will re-read the file_path, but since we already saved it as txt, 
    # extract_text will just read it as txt.
    background_tasks.add_task(process_document, doc.id, db)
    return doc



@router.get("/documents", response_model=list[schemas.DocumentOut])
def list_documents(subject_id: str | None = None, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    q = db.query(models.Document).join(models.Subject).filter(models.Subject.user_id == user.id)
    if subject_id:
        q = q.filter(models.Document.subject_id == subject_id)
        
    docs = q.order_by(models.Document.uploaded_at.desc()).all()
    
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    valid_docs = []
    for doc in docs:
        if doc.status != "indexed" and (now - doc.uploaded_at) > timedelta(hours=24):
            delete_document_vectors(doc.id)
            if doc.file_path and os.path.exists(doc.file_path):
                try:
                    os.remove(doc.file_path)
                except Exception:
                    pass
            db.delete(doc)
            db.commit()
        else:
            valid_docs.append(doc)
            
    return valid_docs


@router.get("/documents/{document_id}", response_model=schemas.DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db),
                  user: models.User = Depends(get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db),
                     user: models.User = Depends(get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    try:
        delete_document_vectors(document_id)
    except Exception as e:
        print(f"Failed to delete vectors for {document_id}: {e}")
        
    if getattr(doc, 'file_path', None) and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"Failed to delete file {doc.file_path}: {e}")
            
    if getattr(doc, 'raw_text_path', None) and os.path.exists(doc.raw_text_path):
        try:
            os.remove(doc.raw_text_path)
        except Exception as e:
            print(f"Failed to delete raw text file {doc.raw_text_path}: {e}")
            
    cleanup_document_relations(document_id, user.id, db)
    db.delete(doc)
    db.commit()
    return {"deleted": True}


@router.get("/documents/{document_id}/notes", response_model=list[schemas.NoteOut])
def get_document_notes(document_id: str, db: Session = Depends(get_db),
                        user: models.User = Depends(get_current_user)):
    return db.query(models.Note).filter(models.Note.document_id == document_id).all()




# ---------- Personal-library semantic search ----------
@router.get("/search")
def search_library(q: str, subject_id: str | None = None,
                    db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Instant retrieval across the user's entire permanent knowledge base —
    prioritizes keyword matches in titles/summaries and falls back to semantic search."""
    
    # 1. Exact Keyword Search on Documents
    keyword_docs = db.query(models.Document).join(models.Subject).filter(
        models.Subject.user_id == user.id,
        models.Document.status == "indexed",
        (models.Document.title.ilike(f"%{q}%")) | (models.Document.summary.ilike(f"%{q}%"))
    ).all()
    
    # 2. Exact Keyword Search on Notes
    keyword_notes = db.query(models.Note).join(models.Topic).join(models.Subject).filter(
        models.Subject.user_id == user.id,
        (models.Note.title.ilike(f"%{q}%")) | (models.Note.content.ilike(f"%{q}%"))
    ).all()

    results = []
    seen_ids = set()

    for d in keyword_docs:
        if d.id not in seen_ids:
            results.append({
                "document_id": d.id,
                "title": d.title,
                "snippet": (d.summary[:400] + "...") if d.summary else "Document matching keyword."
            })
            seen_ids.add(d.id)
            
    for n in keyword_notes:
        fake_doc_id = f"note_{n.id}"
        if fake_doc_id not in seen_ids:
            results.append({
                "document_id": fake_doc_id,
                "title": n.title or "Manual Note",
                "snippet": (n.content[:400] + "...") if n.content else "Note matching keyword."
            })
            seen_ids.add(fake_doc_id)

    # 3. Semantic Search as fallback
    try:
        semantic_res = semantic_search(q, k=8)
        for r in semantic_res:
            doc_id = r.metadata.get("document_id")
            if doc_id and doc_id not in seen_ids:
                # Need to verify doc belongs to user
                doc = db.query(models.Document).join(models.Subject).filter(
                    models.Subject.user_id == user.id,
                    models.Document.id == doc_id
                ).first()
                if doc:
                    results.append({
                        "document_id": doc_id,
                        "title": r.metadata.get("title") or doc.title,
                        "snippet": r.page_content[:400]
                    })
                    seen_ids.add(doc_id)
    except Exception as e:
        print("Semantic search failed or unavailable:", e)

    return results[:8]


@router.get("/documents-by-date", response_model=list[schemas.DocumentOut])
def get_documents_by_date(date: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    from datetime import datetime, timedelta
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
        
    start_dt = dt
    end_dt = dt + timedelta(days=1)
    
    docs = db.query(models.Document).join(models.Subject).filter(
        models.Subject.user_id == user.id,
        models.Document.status == "indexed",
        models.Document.uploaded_at >= start_dt,
        models.Document.uploaded_at < end_dt
    ).all()
    
    return docs


@router.get("/documents-upload-dates", response_model=list[str])
def get_documents_upload_dates(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    docs = db.query(models.Document.uploaded_at).join(models.Subject).filter(
        models.Subject.user_id == user.id,
        models.Document.status == "indexed"
    ).all()
    
    dates = list(set([doc.uploaded_at.strftime("%Y-%m-%d") for doc in docs if doc.uploaded_at]))
    return dates
