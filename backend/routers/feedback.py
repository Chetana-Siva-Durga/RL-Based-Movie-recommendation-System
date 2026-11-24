from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
try:
    from ..database import get_db
    from ..models import UserFeedback, Movie, RecommendationLog
except ImportError:
    from database import get_db
    from models import UserFeedback, Movie, RecommendationLog
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

class FeedbackCreate(BaseModel):
    movie_id: str
    movie_title: str
    feedback: str
    reward: float
    mood_context: Optional[str] = None
    explanation: Optional[str] = None
    algorithm: Optional[str] = "epsilon_greedy"

@router.get("/")
def get_feedback(db: Session = Depends(get_db)):
    return db.query(UserFeedback).order_by(UserFeedback.created_date).all()

@router.post("/")
def create_feedback(data: FeedbackCreate, db: Session = Depends(get_db)):
    # 1. Create feedback entry
    fb = UserFeedback(id=str(uuid.uuid4()), **data.dict())
    db.add(fb)
    
    # 2. Update movie stats (Learning step)
    movie = db.query(Movie).filter(Movie.id == data.movie_id).first()
    if movie:
        movie.reward_score += data.reward
    
    db.commit()
    db.refresh(fb)
    return fb


@router.delete("/reset")
def reset_all_data(db: Session = Depends(get_db)):
    db.query(UserFeedback).delete()
    db.query(RecommendationLog).delete()
    db.query(Movie).update({"reward_score": 0, "recommend_count": 0})
    db.commit()
    return {"message": "All RL data cleared successfully"}
