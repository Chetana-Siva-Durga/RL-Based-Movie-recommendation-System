import json
import os
import uuid
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    from .database import engine, SessionLocal
    from .models import Base, Movie
    from .routers import movies, feedback, logs, recommend, auth
except ImportError:
    from database import engine, SessionLocal
    from models import Base, Movie
    from routers import movies, feedback, logs, recommend, auth

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database initialization error: {e}")


def seed_database_if_empty():
    db = SessionLocal()
    try:
        if db.query(Movie).count() > 0:
            return
        data_path = Path(__file__).resolve().parent / "data" / "movies.json"
        with data_path.open("r", encoding="utf-8") as movie_file:
            movies_data = json.load(movie_file)
        for item in movies_data:
            keywords = item.get("keywords", [])
            if isinstance(keywords, list):
                keywords = ",".join(keywords)
            db.add(Movie(
                id=str(uuid.uuid4()),
                title=item["title"],
                genre=item.get("genre"),
                primary_mood=item.get("primary_mood"),
                secondary_mood=item.get("secondary_mood"),
                year=item.get("year"),
                director=item.get("director"),
                lead_actor=item.get("lead_actor"),
                popularity=item.get("popularity", 5),
                imdb_rating=item.get("imdb_rating"),
                keywords=keywords,
                description=item.get("description"),
                poster_url=item.get("poster_url"),
                reward_score=item.get("reward_score", 0),
                recommend_count=item.get("recommend_count", 0),
            ))
        db.commit()
    finally:
        db.close()


seed_database_if_empty()

app = FastAPI(title="Telugu RL Recommender API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(movies.router)
app.include_router(feedback.router)
app.include_router(logs.router)
app.include_router(recommend.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {"status": "Telugu RL Recommender API running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)