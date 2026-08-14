from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import datetime

from app import models, schemas
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/study_targets", tags=["study_targets"])

@router.post("", response_model=schemas.StudyTargetOut)
def create_study_target(payload: schemas.StudyTargetCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    target_date = datetime.datetime.utcnow() + datetime.timedelta(days=payload.days)
    target = models.StudyTarget(
        user_id=user.id,
        title=payload.title,
        target_date=target_date
    )
    db.add(target)
    db.commit()
    db.refresh(target)
    return target

@router.get("", response_model=list[schemas.StudyTargetOut])
def get_study_targets(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.StudyTarget).filter(models.StudyTarget.user_id == user.id).all()

@router.delete("/{target_id}")
def delete_study_target(target_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    target = db.query(models.StudyTarget).filter(models.StudyTarget.id == target_id, models.StudyTarget.user_id == user.id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(target)
    db.commit()
    return {"status": "ok"}

@router.post("/{target_id}/tasks", response_model=schemas.DailyStudyTaskOut)
def add_daily_task(target_id: str, payload: schemas.DailyStudyTaskCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    target = db.query(models.StudyTarget).filter(models.StudyTarget.id == target_id, models.StudyTarget.user_id == user.id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    task = models.DailyStudyTask(
        target_id=target_id,
        user_id=user.id,
        description=payload.description
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.patch("/tasks/{task_id}/toggle", response_model=schemas.DailyStudyTaskOut)
def toggle_task(task_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    task = db.query(models.DailyStudyTask).filter(models.DailyStudyTask.id == task_id, models.DailyStudyTask.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.is_completed = not task.is_completed
    db.commit()
    db.refresh(task)
    return task

@router.delete("/tasks/reset")
def reset_tasks(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    twenty_four_hours_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    tasks = db.query(models.DailyStudyTask).filter(
        models.DailyStudyTask.user_id == user.id,
        models.DailyStudyTask.created_at >= twenty_four_hours_ago
    ).all()
    for task in tasks:
        db.delete(task)
    db.commit()
    return {"status": "ok"}

@router.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    task = db.query(models.DailyStudyTask).filter(models.DailyStudyTask.id == task_id, models.DailyStudyTask.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"status": "ok"}
@router.post("/tasks", response_model=schemas.DailyStudyTaskOut)
def add_global_daily_task(payload: schemas.DailyStudyTaskCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    task = models.DailyStudyTask(
        target_id=payload.target_id,
        user_id=user.id,
        description=payload.description
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/tasks", response_model=list[schemas.DailyStudyTaskOut])
def get_global_daily_tasks(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    # Return all tasks created within the last 24 hours
    twenty_four_hours_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    return db.query(models.DailyStudyTask).filter(
        models.DailyStudyTask.user_id == user.id,
        models.DailyStudyTask.created_at >= twenty_four_hours_ago
    ).order_by(models.DailyStudyTask.created_at.desc()).all()

@router.get("/analytics/tasks")
def get_daily_tasks_analytics(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    # Get all tasks for analytics from the last 24 hours
    twenty_four_hours_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    all_tasks = db.query(models.DailyStudyTask).filter(
        models.DailyStudyTask.user_id == user.id,
        models.DailyStudyTask.created_at >= twenty_four_hours_ago
    ).all()
    
    total = len(all_tasks)
    completed = len([t for t in all_tasks if t.is_completed])
    
    return {
        "total": total,
        "completed": completed,
        "completion_rate": (completed / total * 100) if total > 0 else 0
    }
