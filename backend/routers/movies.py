import math
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Movie
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/movies", tags=["movies"])


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class MovieCreate(BaseModel):
    title: str
    genre: Optional[str] = None
    primary_mood: Optional[str] = None
    secondary_mood: Optional[str] = None
    year: Optional[int] = None
    director: Optional[str] = None
    lead_actor: Optional[str] = None
    popularity: Optional[float] = 5.0
    imdb_rating: Optional[float] = None
    keywords: Optional[str] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None


class MovieUpdate(BaseModel):
    reward_score: Optional[float] = None
    recommend_count: Optional[int] = None


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/")
def get_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    search: Optional[str] = None,
    genre: Optional[str] = None,
    mood: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Paginated movie list with optional server-side filtering.
    Returns { items, total, page, limit, pages }.
    """
    query = db.query(Movie)

    if search:
        query = query.filter(Movie.title.ilike(f"%{search}%"))
    if genre and genre != "all":
        query = query.filter(Movie.genre == genre)
    if mood and mood != "all":
        query = query.filter(Movie.primary_mood == mood)

    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if total > 0 else 1,
    }


@router.post("/")
def create_movie(data: MovieCreate, db: Session = Depends(get_db)):
    """Create a new movie (used by Admin panel)."""
    movie = Movie(id=str(uuid.uuid4()), **data.dict())
    db.add(movie)
    db.commit()
    db.refresh(movie)
    return movie


@router.patch("/{movie_id}")
def update_movie(movie_id: str, data: MovieUpdate, db: Session = Depends(get_db)):
    """Update RL stats (reward_score / recommend_count) after feedback."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    if data.reward_score is not None:
        movie.reward_score = data.reward_score
    if data.recommend_count is not None:
        movie.recommend_count = data.recommend_count
    db.commit()
    db.refresh(movie)
    return movie


@router.delete("/{movie_id}")
def delete_movie(movie_id: str, db: Session = Depends(get_db)):
    """Delete a movie (used by Admin panel)."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    db.delete(movie)
    db.commit()
    return {"status": "deleted", "id": movie_id}