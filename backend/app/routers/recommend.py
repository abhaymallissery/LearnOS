from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.auth import get_current_user
from app.services.recommender import recommend_next_topics

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


@router.get("/next-topics")
def next_topics(limit: int = 5, db: Session = Depends(get_db),
                 user: models.User = Depends(get_current_user)):
    return recommend_next_topics(db, user.id, limit=limit)
