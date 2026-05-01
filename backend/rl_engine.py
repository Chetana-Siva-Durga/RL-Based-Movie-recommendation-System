import random
import math

EPSILON_DEFAULT = 0.4
EPSILON_MIN = 0.05
DECAY_RATE = 0.999


def compute_context_score(movie, context):
    """Compute how relevant a movie is given the user's context."""
    score = 0

    if movie.get("primary_mood") == context.get("mood"):
        score += 5
    if movie.get("secondary_mood") == context.get("mood"):
        score += 3

    if movie.get("genre") == context.get("genre"):
        score += 4

    raw_movie_kw = movie.get("keywords") or []
    if isinstance(raw_movie_kw, str):
        movie_keywords = set(k.strip().lower() for k in raw_movie_kw.split(",") if k.strip())
    else:
        movie_keywords = set(k.strip().lower() for k in raw_movie_kw)

    raw_ctx_kw = context.get("keywords") or []
    if isinstance(raw_ctx_kw, str):
        context_keywords = set(k.strip().lower() for k in raw_ctx_kw.split(",") if k.strip())
    else:
        context_keywords = set(k.strip().lower() for k in raw_ctx_kw)
        
    score += len(movie_keywords & context_keywords) * 2

    ref = context.get("reference_movie")
    if ref:
        if movie.get("genre") == ref.get("genre"):
            score += 3
        if movie.get("primary_mood") == ref.get("primary_mood"):
            score += 3
        if movie.get("secondary_mood") == ref.get("secondary_mood"):
            score += 1
        if movie.get("director") == ref.get("director"):
            score += 2
        if movie.get("lead_actor") == ref.get("lead_actor"):
            score += 1
        if movie.get("id") == ref.get("id"):
            score = -100

    return score


def compute_exploit_score(movie):
    """Derive exploitation score from persistent DB fields (stateless)."""
    count = movie.get("recommend_count") or 0
    if count == 0:
        return 0
    return (movie.get("reward_score") or 0) / count


def select_movie(movies, context, session_count=0):
    """
    ε-Greedy selection — reads reward_score/recommend_count directly from
    movie dicts (loaded from DB) so learning persists across restarts.
    Returns (movie, is_exploration, epsilon).
    """
    epsilon = max(
        EPSILON_MIN,
        EPSILON_DEFAULT * math.pow(DECAY_RATE, session_count)
    )

    explore = random.random() < epsilon

    if explore:
        context_scores = [(m, compute_context_score(m, context)) for m in movies]
        eligible = [(m, s) for m, s in context_scores if s > 0]
        pool = eligible if eligible else context_scores
        chosen = random.choice(pool)
        return chosen[0], True, epsilon

    best_movie = None
    best_score = -float("inf")

    for movie in movies:
        context_score = compute_context_score(movie, context)
        exploit_score = compute_exploit_score(movie)
        score = context_score * 0.6 + exploit_score * 3 + (movie.get("popularity") or 5) * 0.2

        if score > best_score:
            best_score = score
            best_movie = movie

    return best_movie, False, epsilon


def get_similar_movies(movies, target_movie, limit=4):
    """Find movies similar to target_movie using context scoring."""
    if not target_movie:
        return []

    context = {
        "mood": target_movie.get("primary_mood"),
        "genre": target_movie.get("genre"),
        "keywords": target_movie.get("keywords"),
        "reference_movie": target_movie,
    }

    scored = [
        (m, compute_context_score(m, context))
        for m in movies
        if m.get("id") != target_movie.get("id")
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [m for m, _ in scored[:limit]]


def generate_explanation(movie, context, is_exploration):
    """Generate a human-readable explanation for why this movie was recommended."""
    reasons = []

    if context.get("mood"):
        if movie.get("primary_mood") == context["mood"]:
            reasons.append(f'it perfectly matches your "{context["mood"].lower()}" mood')
        elif movie.get("secondary_mood") == context["mood"]:
            reasons.append(f'it carries undertones of "{context["mood"].lower()}" that align with your mood')

    ref = context.get("reference_movie")
    if ref:
        if movie.get("genre") == ref.get("genre"):
            reasons.append(f'it shares the {(movie.get("genre") or "").lower()} genre with "{ref.get("title")}"')
        if movie.get("primary_mood") == ref.get("primary_mood"):
            reasons.append("it has a similar emotional tone")
        if movie.get("director") == ref.get("director"):
            reasons.append(f'it\'s directed by the same filmmaker, {movie.get("director")}')

    reward = movie.get("reward_score") or 0
    count = movie.get("recommend_count") or 0
    if reward > 0 and count > 0:
        approval = round((reward / count) * 100)
        reasons.append(f"it has received positive feedback from users ({approval}% approval)")

    if (movie.get("imdb_rating") or 0) >= 8.0:
        reasons.append(f'it\'s critically acclaimed with an IMDb rating of {movie.get("imdb_rating")}')

    if is_exploration:
        reasons.append("the RL agent is exploring new options to discover hidden gems for you")

    if not reasons:
        reasons.append(f'it\'s a highly popular {(movie.get("genre") or "").lower()} Telugu movie')

    return f"This movie was recommended because {', '.join(reasons)}."


def update(movie, reward):
    """Update movie stats in-place (used for simulation and internal logic)."""
    current_reward = movie.get("reward_score") or 0
    current_count = movie.get("recommend_count") or 0
    movie["reward_score"] = current_reward + reward
    movie["recommend_count"] = current_count + 1