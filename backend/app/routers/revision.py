import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import get_current_user
from app.services.spaced_repetition import schedule_next_review

router = APIRouter(prefix="/api/revision", tags=["revision"])


@router.get("/due")
def due_reviews(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    today = datetime.date.today().isoformat()
    items = db.query(models.RevisionSchedule).filter(
        models.RevisionSchedule.user_id == user.id,
        models.RevisionSchedule.next_review_date <= today,
    ).all()
    out = []
    for i in items:
        topic = db.query(models.Topic).filter(models.Topic.id == i.topic_id).first()
        out.append({
            "schedule_id": i.id,
            "topic_id": i.topic_id,
            "topic_name": topic.name if topic else None,
            "next_review_date": i.next_review_date,
            "repetitions": i.repetitions,
        })
    return out


@router.get("/upcoming")
def upcoming_reviews(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    items = db.query(models.RevisionSchedule).filter(
        models.RevisionSchedule.user_id == user.id
    ).order_by(models.RevisionSchedule.next_review_date).all()
    return [
        {"schedule_id": i.id, "topic_id": i.topic_id, "next_review_date": i.next_review_date}
        for i in items
    ]


@router.post("/review")
def submit_review(payload: schemas.RevisionReview, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    schedule = db.query(models.RevisionSchedule).filter(
        models.RevisionSchedule.id == payload.schedule_id, models.RevisionSchedule.user_id == user.id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule entry not found")

    ef, interval, reps, next_date = schedule_next_review(
        schedule.ease_factor, schedule.interval_days, schedule.repetitions, payload.quality
    )
    schedule.ease_factor = ef
    schedule.interval_days = interval
    schedule.repetitions = reps
    schedule.next_review_date = next_date
    schedule.last_reviewed_at = datetime.datetime.utcnow()
    db.commit()
    return {"status": "ok"}


@router.get("/sticky_notes")
def get_sticky_notes(subject_id: str = None, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    import random
    from app.services.summarizer import generate_sticky_notes

    subjects = db.query(models.Subject).filter(models.Subject.user_id == user.id).all()
    if not subjects:
        return [{"term": "No Subjects", "definition": "You need to create a subject and upload documents to generate sticky notes.", "subject": "System"}]

    sub_ids = [s.id for s in subjects]
    if subject_id and subject_id in sub_ids:
        sub_ids = [subject_id]
    
    # Get recent documents
    docs = db.query(models.Document).filter(models.Document.subject_id.in_(sub_ids)).order_by(models.Document.uploaded_at.desc()).limit(5).all()
    
    # Get all notes for these documents or recent topics
    notes = []
    if docs:
        notes = db.query(models.Note).filter(models.Note.document_id.in_([d.id for d in docs])).limit(5).all()

    combined_text = ""
    for d in docs:
        if d.summary: combined_text += f"\nSubject: {d.subject.name}\nDocument Summary: {d.summary}"
    for n in notes:
        combined_text += f"\nNote: {n.title}\n{n.content[:1000]}"

    if not combined_text:
        return [{"term": "No Content", "definition": "Upload documents with text to generate AI concept flashcards.", "subject": "System"}]

    # Generate sticky notes
    sticky_notes = generate_sticky_notes(combined_text)
    
    if not sticky_notes:
        return [{"term": "Generation Failed", "definition": "Could not extract simple concepts right now. Try uploading more detailed documents.", "subject": "System"}]

    for sn in sticky_notes:
        if "subject" not in sn or not sn["subject"]:
            sn["subject"] = random.choice(docs).subject.name if docs else "General"

    return sticky_notes
