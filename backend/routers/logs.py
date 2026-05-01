from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import RecommendationLog
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/api/logs", tags=["logs"])

class LogCreate(BaseModel):
    movie_id: str
    movie_title: Optional[str] = None
    input_type: str
    input_value: Optional[str] = None
    explanation: Optional[str] = None
    epsilon_used: Optional[float] = None
    was_exploration: Optional[bool] = None

@router.post("/")
def create_log(data: LogCreate, db: Session = Depends(get_db)):
    log = RecommendationLog(id=str(uuid.uuid4()), **data.dict())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log