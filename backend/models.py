from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime
from sqlalchemy.sql import func
from database import Base
import uuid

def gen_id():
    return str(uuid.uuid4())

class Movie(Base):
    __tablename__ = "movies"
    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    genre = Column(String)
    primary_mood = Column(String)
    secondary_mood = Column(String)
    year = Column(Integer)
    director = Column(String)
    lead_actor = Column(String)
    popularity = Column(Float, default=5)
    imdb_rating = Column(Float)
    keywords = Column(String)
    description = Column(String)
    poster_url = Column(String)
    reward_score = Column(Float, default=0)
    recommend_count = Column(Integer, default=0)
    created_date = Column(DateTime, server_default=func.now())

class UserFeedback(Base):
    __tablename__ = "user_feedback"
    id = Column(String, primary_key=True, default=gen_id)
    movie_id = Column(String)
    movie_title = Column(String)
    feedback = Column(String)
    reward = Column(Float)
    mood_context = Column(String)
    explanation = Column(String)
    algorithm = Column(String, default="epsilon_greedy")
    created_date = Column(DateTime, server_default=func.now())

class RecommendationLog(Base):
    __tablename__ = "recommendation_logs"
    id = Column(String, primary_key=True, default=gen_id)
    movie_id = Column(String)
    movie_title = Column(String)
    input_type = Column(String)
    input_value = Column(String)
    explanation = Column(String)
    epsilon_used = Column(Float)
    was_exploration = Column(Boolean)
    created_date = Column(DateTime, server_default=func.now())