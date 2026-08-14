from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import get_current_user
from app.services.vectorstore import semantic_search
from app.services.summarizer import answer_from_context

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/sessions", response_model=dict)
def create_session(payload: schemas.ChatSessionCreate, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    session = models.ChatSession(
        user_id=user.id, title=payload.title, document_ids=payload.document_ids, topic_ids=payload.topic_ids
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "title": session.title, "document_ids": session.document_ids, "topic_ids": session.topic_ids}


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    sessions = db.query(models.ChatSession).filter(models.ChatSession.user_id == user.id).order_by(models.ChatSession.created_at.desc()).all()
    return [{"id": s.id, "title": s.title, "document_ids": s.document_ids, "topic_ids": s.topic_ids} for s in sessions]

@router.patch("/sessions/{session_id}")
def rename_session(session_id: str, payload: schemas.ChatSessionUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = payload.title
    db.commit()
    db.refresh(session)
    return {"id": session.id, "title": session.title}


@router.get("/sessions/{session_id}/messages", response_model=list[schemas.ChatMessageOut])
def get_messages(session_id: str, db: Session = Depends(get_db),
                  user: models.User = Depends(get_current_user)):
    session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Check access: Owner or shared via read_write link
    if session.user_id != user.id:
        share_link = db.query(models.ShareLink).filter(
            models.ShareLink.chat_session_id == session_id,
            models.ShareLink.access_level == "read_write"
        ).first()
        if not share_link:
            raise HTTPException(status_code=403, detail="Not authorized to view this chat")

    return db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session_id
    ).order_by(models.ChatMessage.created_at).all()


@router.post("/ask", response_model=schemas.ChatMessageOut)
def ask(payload: schemas.ChatAsk, db: Session = Depends(get_db),
        user: models.User = Depends(get_current_user)):
    session = db.query(models.ChatSession).filter(models.ChatSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if session.user_id != user.id:
        share_link = db.query(models.ShareLink).filter(
            models.ShareLink.chat_session_id == payload.session_id,
            models.ShareLink.access_level == "read_write"
        ).first()
        if not share_link:
            raise HTTPException(status_code=403, detail="Not authorized to post to this chat")

    db.add(models.ChatMessage(session_id=session.id, role="user", content=payload.question))
    db.commit()

    context_chunks = []
    sources = []
    
    # 1. Inject Manual Notes if topic_ids are provided
    if session.topic_ids:
        notes = db.query(models.Note).filter(models.Note.topic_id.in_(session.topic_ids)).all()
        for note in notes:
            context_chunks.append(f"Manual Note ({note.title}): {note.content}")
            sources.append({"document_id": f"note_{note.id}", "title": note.title})

    # 2. Add Documents via Semantic Search if document_ids are provided, or if neither are provided (global search)
    if session.document_ids or (not session.document_ids and not session.topic_ids):
        scope = session.document_ids or None
        try:
            hits = semantic_search(payload.question, k=5, document_ids=scope)
            context_chunks.extend([h.page_content for h in hits])
            sources.extend([
                {"document_id": h.metadata.get("document_id"), "title": h.metadata.get("title")}
                for h in hits
            ])
        except Exception as e:
            print(f"Semantic search failed (e.g. embedding API timeout): {e}")
            # If semantic search fails, we continue with whatever context we have (e.g. manual notes) 
            # or it will just fallback to answering from its own knowledge if context is empty.

    import time
    start_time = time.time()
    
    if context_chunks:
        answer = answer_from_context(payload.question, context_chunks)
    else:
        answer = "I couldn't find anything relevant in the selected study materials. Try selecting more documents or rephrasing your question."
        
    elapsed_time = round(time.time() - start_time, 2)
    answer += f"\n\n*(Response time: {elapsed_time}s)*"

    msg = models.ChatMessage(
        session_id=session.id, role="assistant", content=answer, sources=sources
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id, models.ChatSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"deleted": True}
