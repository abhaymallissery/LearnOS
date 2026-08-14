from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import get_current_user
from app.services import qgen
from app.services.spaced_repetition import schedule_next_review
import datetime

router = APIRouter(prefix="/api/exam", tags=["exam"])


@router.post("/generate")
def generate_quiz(payload: schemas.QuizGenerateRequest, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    if not payload.document_ids and not payload.subject_id and not payload.topic_ids and not payload.topic_id:
        raise HTTPException(status_code=400, detail="document_ids, topic_ids, subject_id, or topic_id required")

    combined_text = ""
    topic_title = "Topic Assessment"
    
    # Handle legacy topic_id
    topic_ids_to_fetch = list(payload.topic_ids)
    if payload.topic_id and payload.topic_id not in topic_ids_to_fetch:
        topic_ids_to_fetch.append(payload.topic_id)
        
    if topic_ids_to_fetch:
        notes = db.query(models.Note).filter(models.Note.topic_id.in_(topic_ids_to_fetch)).all()
        for note in notes:
            combined_text += note.content + "\n"
        topic = db.query(models.Topic).filter(models.Topic.id == topic_ids_to_fetch[0]).first()
        if topic:
            topic_title = f"Quiz - {topic.name}"

    docs = []
    if payload.document_ids:
        docs = db.query(models.Document).filter(
            models.Document.id.in_(payload.document_ids),
            models.Document.status == "indexed"
        ).all()
    elif payload.subject_id and not topic_ids_to_fetch:
        docs = db.query(models.Document).filter(
            models.Document.subject_id == payload.subject_id,
            models.Document.status == "indexed",
        ).all()

    for doc in docs:
        if doc.raw_text_path:
            with open(doc.raw_text_path, "r", encoding="utf-8", errors="ignore") as f:
                doc_text = f.read()
                
                # If document is massive (e.g. YouTube video), use its summary and AI generated notes
                if len(doc_text) > 15000:
                    combined_text += f"\n--- {doc.title} (Summary) ---\n"
                    combined_text += doc.summary + "\n"
                    for note in doc.notes:
                        combined_text += note.content + "\n"
                else:
                    combined_text += f"\n--- {doc.title} ---\n"
                    combined_text += doc_text + "\n"
                
    if docs and not topic_ids_to_fetch:
        topic_title = f"Quiz - {docs[0].title if len(docs) == 1 else 'Subject Assessment'}"

    if not combined_text.strip():
        raise HTTPException(status_code=400, detail="No processed text available yet for these materials")

    try:
        questions = qgen.generate_questions(
            combined_text, payload.question_types, payload.num_questions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NLP Generation Error: {str(e)}")

    if not questions:
        raise HTTPException(status_code=422, detail="Could not generate questions from this material. Text may be too short or lack key terms.")

    quiz = models.Quiz(
        user_id=user.id,
        subject_id=payload.subject_id,
        document_id=payload.document_ids[0] if payload.document_ids and len(payload.document_ids) == 1 else None,
        title=topic_title,
        question_types=payload.question_types,
        questions=questions,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return {
        "quiz_id": quiz.id,
        "title": quiz.title,
        "questions": [
            {k: v for k, v in q.items() if k != "answer"} for q in questions
        ],
    }


@router.post("/submit")
def submit_quiz(payload: schemas.QuizSubmit, db: Session = Depends(get_db),
                 user: models.User = Depends(get_current_user)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == payload.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    result = qgen.grade_quiz(quiz.questions, payload.answers)

    attempt = models.QuizAttempt(
        quiz_id=quiz.id,
        user_id=user.id,
        answers=payload.answers,
        score=result["score"],
        weak_concepts=result["weak_concepts"],
    )
    db.add(attempt)

    # Update topic mastery + queue a spaced-repetition entry for weak areas.
    if quiz.subject_id:
        topic = db.query(models.Topic).filter(models.Topic.subject_id == quiz.subject_id).first()
        if topic:
            topic.mastery_score = round(min(1.0, max(0.0, result["score"] / 100)), 2)
            existing = db.query(models.RevisionSchedule).filter(
                models.RevisionSchedule.topic_id == topic.id
            ).first()
            quality = 5 if result["score"] >= 80 else (3 if result["score"] >= 50 else 1)
            if existing:
                ef, interval, reps, next_date = schedule_next_review(
                    existing.ease_factor, existing.interval_days, existing.repetitions, quality
                )
                existing.ease_factor, existing.interval_days = ef, interval
                existing.repetitions, existing.next_review_date = reps, next_date
                existing.last_reviewed_at = datetime.datetime.utcnow()
            else:
                ef, interval, reps, next_date = schedule_next_review(2.5, 1, 0, quality)
                db.add(models.RevisionSchedule(
                    user_id=user.id, topic_id=topic.id, ease_factor=ef,
                    interval_days=interval, repetitions=reps, next_review_date=next_date,
                    last_reviewed_at=datetime.datetime.utcnow(),
                ))

    db.commit()
    return {
        "score": result["score"],
        "weak_concepts": result["weak_concepts"],
        "detailed_results": result.get("detailed_results", []),
        "recommendation": "Review the weak concepts below, then revisit this topic in the Revision Center."
                            if result["weak_concepts"] else "Great job — this topic is scheduled for a spaced review.",
    }


@router.get("/history")
def quiz_history(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.user_id == user.id).order_by(
        models.QuizAttempt.taken_at.desc()
    ).all()
    return [
        {"quiz_id": a.quiz_id, "score": a.score, "taken_at": a.taken_at, "weak_concepts": a.weak_concepts}
        for a in attempts
    ]
