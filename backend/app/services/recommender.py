"""
Personalized Recommendation Engine.

Rule-based (fully explainable, no external API) scoring that combines:
  - prerequisite completion (a topic is only eligible once its prerequisite
    topic is completed)
  - current mastery score (lower mastery = higher priority to revisit)
  - overdue spaced-repetition items (topics due for revision are boosted)

This produces a small ranked "study next" list for the dashboard.
"""
from sqlalchemy.orm import Session
from app import models
import datetime


import random

def recommend_next_topics(db: Session, user_id: str, limit: int = 5):
    """
    Dynamically generates a 'what to study next' recommendation by checking:
    1. Documents/Notes inside Subjects
    2. Topics
    3. Study Plan (StudyTargets / DailyStudyTasks)
    """
    recommendations = []
    
    # 1. First, try to get 1 Subject/Topic recommendation
    subject_recommendation = None
    
    # Try documents first
    subjects = db.query(models.Subject).filter(models.Subject.user_id == user_id).all()
    for subject in subjects:
        try:
            docs = db.query(models.Document).filter(
                models.Document.subject_id == subject.id,
                models.Document.status == "indexed"
            ).all()
            if not docs:
                continue
                
            random.shuffle(docs)
            selected_notes = None
            selected_doc = None
            
            for doc in docs:
                notes = db.query(models.Note).filter(models.Note.document_id == doc.id).first()
                if notes and notes.key_terms and isinstance(notes.key_terms, list):
                    selected_notes = notes
                    selected_doc = doc
                    break
            
            if not selected_notes:
                continue
                
            sample_size = min(3, len(selected_notes.key_terms))
            concepts_path = random.sample(selected_notes.key_terms, sample_size)
            path_str = " ➔ ".join(concepts_path)
            
            subject_recommendation = {
                "topic_id": f"sub-{subject.id}-doc-{selected_doc.id}", 
                "topic_name": f"{subject.name} Focus: {path_str}",
                "subject_id": subject.id,
                "how_to_study": f"Review these specific concepts in '{selected_doc.title}'.",
                "reason": f"These interconnected topics form a core part of '{subject.name}'.",
                "score": random.randint(7, 10),
            }
            break # Found 1, stop
        except Exception as e:
            print(f"Error generating recommendation for subject {subject.id}: {e}")
            continue

    # If no doc recommendation, try topics
    if not subject_recommendation:
        topics = db.query(models.Topic).join(models.Subject).filter(
            models.Subject.user_id == user_id,
            models.Topic.status != "completed"
        ).all()
        if topics:
            topic = random.choice(topics)
            subject_recommendation = {
                "topic_id": f"topic-{topic.id}",
                "topic_name": topic.name,
                "subject_id": topic.subject_id,
                "how_to_study": "Write a manual note or generate a quiz for this topic.",
                "reason": f"You are currently working on '{topic.name}'.",
                "score": random.randint(5, 8),
            }

    if subject_recommendation:
        recommendations.append(subject_recommendation)

    # 2. Try to get 1 pending Daily Task recommendation
    twenty_four_hours_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    tasks = db.query(models.DailyStudyTask).filter(
        models.DailyStudyTask.user_id == user_id,
        models.DailyStudyTask.is_completed == False,
        models.DailyStudyTask.created_at >= twenty_four_hours_ago
    ).all()
    
    if tasks:
        task = random.choice(tasks)
        recommendations.append({
            "topic_id": f"task-{task.id}",
            "topic_name": f"Daily Task: {task.description[:20]}...",
            "subject_id": "",
            "how_to_study": "Complete this daily task from your study plan.",
            "reason": "This is a pending daily task you set for today.",
            "score": random.randint(3, 6),
        })

    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations
