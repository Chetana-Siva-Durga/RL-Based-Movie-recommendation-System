import sys
import json
import uuid
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Movie, Base
from sqlalchemy import text

def import_movies():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Delete all existing data
    db.execute(text("DELETE FROM movies"))
    db.execute(text("DELETE FROM user_feedback"))
    db.execute(text("DELETE FROM recommendation_logs"))
    db.commit()

    with open('data/movies.json', 'r', encoding='utf-8') as f:
        movies_data = json.load(f)

    for m in movies_data:
        # Some movies might have keywords as array, we need them as string if model requires it.
        # Let's check models.py first? We can just pass the data as is.
        # In seed_movies.py, keywords are a comma separated string.
        # Let's check if the array needs to be joined.
        
        keywords = m.get('keywords', [])
        if isinstance(keywords, list):
            m['keywords'] = ','.join(keywords)

        db_movie = Movie(
            id=str(uuid.uuid4()),
            title=m.get('title'),
            genre=m.get('genre'),
            primary_mood=m.get('primary_mood'),
            secondary_mood=m.get('secondary_mood'),
            year=m.get('year'),
            director=m.get('director'),
            lead_actor=m.get('lead_actor'),
            popularity=m.get('popularity'),
            imdb_rating=m.get('imdb_rating'),
            keywords=m.get('keywords'),
            description=m.get('description'),
            poster_url=m.get('poster_url'),
            reward_score=m.get('reward_score', 0),
            recommend_count=m.get('recommend_count', 0)
        )
        db.add(db_movie)
    
    db.commit()
    print(f"All {len(movies_data)} Telugu movies seeded successfully!")
    db.close()

if __name__ == '__main__':
    import_movies()
