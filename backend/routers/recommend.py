from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
try:
    from ..database import get_db
    from ..models import Movie, RecommendationLog
    from .. import rl_engine, thompson_engine
except ImportError:
    from database import get_db
    from models import Movie, RecommendationLog
    import rl_engine
    import thompson_engine
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


class RecommendRequest(BaseModel):
    mood: Optional[str] = None
    genre: Optional[str] = None
    keywords: Optional[str] = None
    user_text: Optional[str] = None
    reference_movie_id: Optional[str] = None
    algorithm: Optional[str] = "epsilon_greedy"   # "epsilon_greedy" | "thompson"
    session_count: Optional[int] = 0


# ── Sentiment & Intent Analysis ─────────────────────────────────────────────
SENTIMENT_MAP = {
    "happy":       {"mood": "Happy",       "opposite": "Intense",   "keywords": ["happy", "joy", "good", "great", "excite", "fun", "cheer", "glad", "wonderful", "awesome", "party"]},
    "sad":         {"mood": "Sad",         "opposite": "Happy",     "keywords": ["sad", "down", "depress", "cry", "alone", "low", "unhappy", "sorrow", "regret", "upset"]},
    "angry":       {"mood": "Intense",     "opposite": "Happy",     "keywords": ["angry", "mad", "hate", "fight", "fury", "annoy", "anger", "frustrate"]},
    "stressed":    {"mood": "Intense",     "opposite": "Fun",       "keywords": ["stress", "tense", "pressure", "tired", "work", "burden", "heavy"]},
    "heartbroken": {"mood": "Emotional",   "opposite": "Inspiring", "keywords": ["heart", "break", "broken", "split", "lost", "love", "hurt", "pain", "heal"]},
    "romantic":    {"mood": "Romantic",    "opposite": "Action",    "keywords": ["romantic", "crush", "date", "sweet", "love", "kiss", "darling"]},
    "scary":       {"mood": "Dark",        "opposite": "Happy",     "keywords": ["scary", "fear", "horror", "creep", "ghost", "dark", "blood", "death"]},
    "bored":       {"mood": "Adventurous", "opposite": "Thrilling", "keywords": ["bore", "nothing", "day", "slow", "lazy", "time"]},
    "thrilled":    {"mood": "Thrilling",   "opposite": "Sad",       "keywords": ["thrill", "suspense", "mystery", "crime", "shock", "kill", "gun", "police", "agent"]},
}

INTENT_KEYWORDS = ["better", "improve", "help", "lift", "change", "refresh", "happy", "boost", "up", "cheer", "good"]

def analyze_sentiment(text: str):
    """
    Robust Sentiment & Intent NLP Logic.
    Handles:
    - Multi-word phrases (e.g. 'heart broken')
    - Typos (partial keyword matching)
    - Fallback to genre names or general popularity
    """
    text = text.lower().strip()
    # Normalize punctuation
    for char in ".,!?;:": text = text.replace(char, " ")
    
    words = text.split()
    joined_text = "".join(words) # handles "heart broken" -> "heartbroken"
    
    detected_emotion = None
    max_score = 0
    
    # 1. Advanced scoring based on keywords and multi-word triggers
    for emotion, data in SENTIMENT_MAP.items():
        score = 0
        # Check standard keywords
        for kw in data["keywords"]:
            if kw in words or kw in joined_text:
                score += 2
            elif len(kw) > 4 and any(kw[:4] in w for w in words): # handles partial typos
                score += 1
                
        if score > max_score:
            max_score = score
            detected_emotion = emotion

    # 2. Intent detection
    intent = "STAY"
    if any(ik in text for ik in INTENT_KEYWORDS):
        intent = "IMPROVE"
    
    # 3. Decision Logic & Fallbacks
    if not detected_emotion or max_score < 1:
        # Fallback to genre mentions
        if "action" in text or "figh" in text: return "Adventurous", "You wanted action—get ready for an adventure!"
        if "comedy" in text or "laug" in text: return "Fun", "Time for some laughs with a comedy selection!"
        if "love" in text: return "Romantic", "Spreading the love with a romantic choice."
        # Ultimate fallback
        return "Happy", "I'm suggesting a highly-rated feel-good movie for you!"

    if intent == "IMPROVE" or "boost" in text:
        target_mood = SENTIMENT_MAP[detected_emotion]["opposite"]
        # Special case: heartbroken + boost -> healing/uplifting
        if detected_emotion == "heartbroken":
            target_mood = "Inspiring"
            reason = "I feel for you. I've picked an Inspiring movie to help heal and motivate you!"
        elif detected_emotion == "happy":
            target_mood = "Happy"
            reason = f"You're already feeling {detected_emotion}! Let's keep the good vibes going."
        else:
            reason = f"I see you're feeling {detected_emotion}. Here's an amazing {target_mood} movie to boost your spirit!"
        return target_mood, reason
    else:
        target_mood = SENTIMENT_MAP[detected_emotion]["mood"]
        reason = f"Since you feel {detected_emotion}, here's a {target_mood} classic that perfectly matches your mood."
        return target_mood, reason


def movie_to_dict(m: Movie) -> dict:
    return {
        "id": m.id,
        "title": m.title,
        "genre": m.genre,
        "primary_mood": m.primary_mood,
        "secondary_mood": m.secondary_mood,
        "year": m.year,
        "director": m.director,
        "lead_actor": m.lead_actor,
        "popularity": m.popularity,
        "imdb_rating": m.imdb_rating,
        "keywords": m.keywords,
        "description": m.description,
        "poster_url": m.poster_url,
        "reward_score": m.reward_score,
        "recommend_count": m.recommend_count,
    }


@router.post("/")
def get_recommendation(req: RecommendRequest, db: Session = Depends(get_db)):
    """
    Main RL recommendation endpoint.
    Takes user context, runs the chosen Python RL engine, and returns
    the winning movie + explanation + similar movies.
    """
    movies = [movie_to_dict(m) for m in db.query(Movie).all()]

    if not movies:
        return {"error": "No movies in database"}

    # Build context dict
    context = {}
    nlp_reason = None

    if req.user_text:
        target_mood, nlp_reason = analyze_sentiment(req.user_text)
        if target_mood:
            context["mood"] = target_mood

    if req.mood and not context.get("mood"):
        context["mood"] = req.mood
    if req.genre:
        context["genre"] = req.genre
    if req.keywords:
        context["keywords"] = req.keywords

    # Resolve reference movie
    if req.reference_movie_id:
        ref_row = db.query(Movie).filter(Movie.id == req.reference_movie_id).first()
        if ref_row:
            ref = movie_to_dict(ref_row)
            context["reference_movie"] = ref
            if not req.mood:
                context["mood"] = ref.get("primary_mood")
            if not req.genre:
                context["genre"] = ref.get("genre")
            if not req.keywords:
                context["keywords"] = ref.get("keywords")

    # Run the selected RL algorithm
    meta = None
    if req.algorithm == "thompson":
        selected, meta = thompson_engine.select_movie_thompson(movies, context)
        is_exploration = False
        epsilon = 0.0
    else:
        selected, is_exploration, epsilon = rl_engine.select_movie(
            movies, context, req.session_count or 0
        )

    if not selected:
        return {"error": "Could not select a movie"}

    similar = rl_engine.get_similar_movies(movies, selected, limit=4)
    selected_row = db.query(Movie).filter(Movie.id == selected["id"]).first()
    if selected_row:
        selected_row.recommend_count += 1
        db.add(RecommendationLog(
            id=str(uuid.uuid4()),
            movie_id=selected["id"],
            movie_title=selected["title"],
            input_type="recommendation",
            input_value=(req.mood or req.genre or req.user_text or ""),
            explanation=rl_engine.generate_explanation(selected, context, is_exploration),
            epsilon_used=epsilon,
            was_exploration=is_exploration,
        ))
        db.commit()
    
    if req.algorithm == "thompson":
        explanation = thompson_engine.generate_explanation(
            selected, context, meta["theta"], meta["alpha"], meta["beta"]
        )
    else:
        explanation = rl_engine.generate_explanation(selected, context, is_exploration)

    if nlp_reason:
        explanation = f"✨ {nlp_reason} | {explanation}"

    return {
        "movie": selected,
        "is_exploration": is_exploration,
        "epsilon": round(epsilon, 4),
        "explanation": explanation,
        "similar_movies": similar,
        "meta": meta if req.algorithm == "thompson" else None
    }
