import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.auth import get_current_user
from app.services.summarizer import generate_daily_entry

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def overview(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    subjects = db.query(models.Subject).filter(models.Subject.user_id == user.id).all()
    subject_ids = [s.id for s in subjects]

    total_documents = db.query(models.Document).filter(
        models.Document.subject_id.in_(subject_ids),
        models.Document.status == "indexed"
    ).count() if subject_ids else 0

    topics = db.query(models.Topic).filter(models.Topic.subject_id.in_(subject_ids)).all() if subject_ids else []
    
    completed_topics = 0.0
    for t in topics:
        if t.status == "completed":
            completed_topics += 1.0
        else:
            target = db.query(models.StudyTarget).filter(
                models.StudyTarget.user_id == user.id,
                models.StudyTarget.title == t.name
            ).first()
            if target:
                tasks = db.query(models.DailyStudyTask).filter(models.DailyStudyTask.target_id == target.id).all()
                if tasks:
                    c = sum(1 for tk in tasks if tk.is_completed)
                    completed_topics += c / len(tasks)

    subject_progress = []
    for s in subjects:
        sub_topics = [t for t in topics if t.subject_id == s.id]
        if not sub_topics:
            continue
        sub_completed = len([t for t in sub_topics if t.status == "completed"])
        subject_progress.append({
            "subject_id": s.id,
            "name": s.name,
            "total": len(sub_topics),
            "completed": sub_completed
        })

    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.user_id == user.id).all()
    avg_score = round(sum(a.score for a in attempts) / len(attempts), 1) if attempts else 0.0

    daily_logs = db.query(models.DailySummary).filter(models.DailySummary.user_id == user.id).order_by(
        models.DailySummary.date.desc()
    ).all()
    streak = _calc_streak([d.date for d in daily_logs])

    return {
        "total_subjects": len(subjects),
        "total_documents": total_documents,
        "total_topics": len(topics),
        "completed_topics": completed_topics,
        "quizzes_taken": len(attempts),
        "average_quiz_score": avg_score,
        "learning_streak_days": streak,
        "subject_progress": subject_progress,
    }


def _calc_streak(dates: list[str]) -> int:
    if not dates:
        return 0
    date_set = set(dates)
    streak = 0
    cursor = datetime.date.today()
    while cursor.isoformat() in date_set:
        streak += 1
        cursor -= datetime.timedelta(days=1)
    return streak


@router.get("/timeline")
def timeline(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    logs = db.query(models.DailySummary).filter(models.DailySummary.user_id == user.id).order_by(
        models.DailySummary.date.desc()
    ).all()
    return [
        {
            "date": l.date,
            "minutes_spent": l.minutes_spent,
            "documents_studied": l.documents_studied,
            "summary_text": l.summary_text,
        }
        for l in logs
    ]


@router.post("/daily-log")
def log_study_session(document_ids: list[str], minutes: int, db: Session = Depends(get_db),
                       user: models.User = Depends(get_current_user)):
    """Called by the frontend whenever a study session ends; builds the Daily
    Summary journal and feeds the Learning Timeline / streaks."""
    today = datetime.date.today().isoformat()
    log = db.query(models.DailySummary).filter(
        models.DailySummary.user_id == user.id, models.DailySummary.date == today
    ).first()

    docs = db.query(models.Document).filter(models.Document.id.in_(document_ids)).all()
    context = "\n".join(f"- {d.title}: {d.summary[:200]}" for d in docs)

    if log:
        log.minutes_spent += minutes
        log.documents_studied = list(set(log.documents_studied + document_ids))
        log.summary_text = generate_daily_entry(context) if context else log.summary_text
    else:
        log = models.DailySummary(
            user_id=user.id,
            date=today,
            documents_studied=document_ids,
            minutes_spent=minutes,
            summary_text=generate_daily_entry(context) if context else "",
        )
        db.add(log)
    db.commit()
    return {"date": today, "summary_text": log.summary_text}
