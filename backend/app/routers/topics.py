from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/topics", tags=["topics"])


class TopicStatusUpdate(BaseModel):
    status: str  # not_started | in_progress | completed

@router.post("", response_model=schemas.TopicOut)
def create_topic(payload: schemas.TopicCreate, db: Session = Depends(get_db),
                  user: models.User = Depends(get_current_user)):
    subject = db.query(models.Subject).filter(
        models.Subject.id == payload.subject_id, models.Subject.user_id == user.id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    topic = models.Topic(
        subject_id=payload.subject_id,
        name=payload.name,
        prerequisite_topic_id=payload.prerequisite_topic_id,
    )
    db.add(topic)
    
    # Handle optional StudyTarget creation
    if payload.target_duration_days:
        import datetime
        target_date = datetime.datetime.utcnow() + datetime.timedelta(days=payload.target_duration_days)
        target = models.StudyTarget(
            user_id=user.id,
            title=payload.name,
            target_date=target_date
        )
        db.add(target)
        db.flush() # get target.id
        
        # Add initial objectives as tasks
        if payload.initial_objectives:
            for obj in payload.initial_objectives:
                task = models.DailyStudyTask(
                    target_id=target.id,
                    user_id=user.id,
                    description=obj
                )
                db.add(task)
                
    db.commit()
    db.refresh(topic)
    return topic


@router.get("", response_model=list[schemas.TopicOut])
def list_topics(subject_id: str = "", db: Session = Depends(get_db),
                 user: models.User = Depends(get_current_user)):
    if subject_id:
        topics = db.query(models.Topic).filter(models.Topic.subject_id == subject_id).all()
    else:
        topics = db.query(models.Topic).join(models.Subject).filter(models.Subject.user_id == user.id).all()
        
    topic_outs = []
    for topic in topics:
        progress = 0
        if topic.status == "completed":
            progress = 100
        else:
            # find matching target
            target = db.query(models.StudyTarget).filter(
                models.StudyTarget.user_id == user.id,
                models.StudyTarget.title == topic.name
            ).first()
            if target:
                tasks = db.query(models.DailyStudyTask).filter(models.DailyStudyTask.target_id == target.id).all()
                if tasks:
                    completed = sum(1 for t in tasks if t.is_completed)
                    progress = int((completed / len(tasks)) * 100)
        
        # Need to return an object/dict that matches TopicOut
        # We can just construct a dict or mutate a copy since SQLAlchemy models are not dicts natively unless we use schemas.TopicOut.from_orm
        topic_dict = schemas.TopicOut.from_orm(topic).dict()
        topic_dict["progress"] = progress
        topic_outs.append(topic_dict)

    return topic_outs


@router.patch("/{topic_id}", response_model=schemas.TopicOut)
def update_topic(topic_id: str, payload: schemas.TopicUpdate, db: Session = Depends(get_db),
                 user: models.User = Depends(get_current_user)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    if payload.name is not None:
        topic.name = payload.name
    if payload.status is not None:
        topic.status = payload.status
        
    if payload.target_duration_days is not None:
        import datetime
        target = db.query(models.StudyTarget).filter(
            models.StudyTarget.user_id == user.id,
            models.StudyTarget.title == topic.name
        ).first()
        target_date = datetime.datetime.utcnow() + datetime.timedelta(days=payload.target_duration_days)
        if target:
            target.target_date = target_date
        else:
            # Create it if it doesn't exist
            new_target = models.StudyTarget(
                user_id=user.id,
                title=topic.name,
                target_date=target_date
            )
            db.add(new_target)
            
    db.commit()
    db.refresh(topic)
    return topic

@router.patch("/{topic_id}/status", response_model=schemas.TopicOut)
def update_status(topic_id: str, payload: TopicStatusUpdate, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    topic.status = payload.status
    db.commit()
    db.refresh(topic)
    return topic

@router.delete("/{topic_id}")
def delete_topic(topic_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    # Also delete the associated StudyTarget if it exists
    target = db.query(models.StudyTarget).filter(
        models.StudyTarget.user_id == user.id,
        models.StudyTarget.title == topic.name
    ).first()
    if target:
        db.delete(target)
        
    db.delete(topic)
    db.commit()
    return {"status": "ok"}

@router.post("/{topic_id}/review_note")
def review_manual_note_endpoint(topic_id: str, payload: schemas.ManualNoteCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    from app.services.summarizer import review_manual_note
    reviewed_content = review_manual_note(topic.name, payload.content)
    return {"reviewed_content": reviewed_content}

@router.post("/{topic_id}/notes", response_model=schemas.NoteOut)
def add_manual_note(topic_id: str, payload: schemas.ManualNoteCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    note = models.Note(
        topic_id=topic_id,
        title=f"Manual Note: {topic.name}",
        content=payload.content,
        key_terms=[]
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.get("/{topic_id}/notes", response_model=list[schemas.NoteOut])
def get_topic_notes(topic_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Note).filter(models.Note.topic_id == topic_id).all()

@router.get("/subject/{subject_id}/notes", response_model=list[schemas.NoteOut])
def get_subject_notes(subject_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    topics = db.query(models.Topic).filter(models.Topic.subject_id == subject_id).all()
    topic_ids = [t.id for t in topics]
    if not topic_ids:
        return []
    return db.query(models.Note).filter(models.Note.topic_id.in_(topic_ids)).all()
