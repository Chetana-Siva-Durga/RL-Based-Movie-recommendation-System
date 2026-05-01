"""
Thompson Sampling (Bayesian Multi-Armed Bandit) Engine
======================================================
Mirrors the JS implementation exactly.

Each movie (arm) maintains a Beta distribution: Beta(alpha, beta)
  alpha = 1 + number of LIKES   (successes)
  beta  = 1 + number of DISLIKES (failures)

Steps:
  1. INITIALIZATION  → derive alpha/beta from stored reward_score & recommend_count
  2. SAMPLING        → draw θ ~ Beta(alpha, beta) via Johnk/Marsaglia-Tsang
  3. ARM SELECTION   → combined = θ × (1 + contextBoost) + contextScore × 0.05
  4. UPDATE          → like → alpha += 1,  dislike → beta += 1  (handled by feedback endpoint)
"""

import random
import math


# ── STEP 1: INITIALIZATION ────────────────────────────────────────────────────

def init_beta_params(movie: dict) -> dict:
    """
    Derive Beta(alpha, beta) from stored DB fields:
      reward_score   = likes − dislikes
      recommend_count = likes + dislikes
    => likes    = (count + score) / 2
    => dislikes = (count − score) / 2
    """
    count = movie.get("recommend_count") or 0
    score = movie.get("reward_score") or 0
    likes    = max(0, round((count + score) / 2))
    dislikes = max(0, round((count - score) / 2))
    return {
        "alpha": 1 + likes,    # uniform prior α=1 so distribution is never degenerate
        "beta":  1 + dislikes,
    }


# ── STEP 2: SAMPLING ──────────────────────────────────────────────────────────

def _randn() -> float:
    """Box-Muller standard normal sample."""
    u, v = 0.0, 0.0
    while u == 0:
        u = random.random()
    while v == 0:
        v = random.random()
    return math.sqrt(-2.0 * math.log(u)) * math.cos(2.0 * math.pi * v)


def _sample_gamma(shape: float) -> float:
    """
    Marsaglia-Tsang method for Gamma(shape, 1) sampling.
    Handles shape < 1 via Ahrens-Dieter transformation.
    """
    if shape < 1:
        return _sample_gamma(1.0 + shape) * (random.random() ** (1.0 / shape))

    d = shape - 1.0 / 3.0
    c = 1.0 / math.sqrt(9.0 * d)

    while True:
        x = _randn()
        v = 1.0 + c * x
        while v <= 0:
            x = _randn()
            v = 1.0 + c * x

        v = v * v * v
        u = random.random()

        if u < 1 - 0.0331 * (x * x) * (x * x):
            return d * v
        if math.log(u) < 0.5 * x * x + d * (1.0 - v + math.log(v)):
            return d * v


def sample_beta(alpha: float, beta: float) -> float:
    """
    Johnk's method: draw θ ~ Beta(alpha, beta) via Gamma ratio.
    θ = Gamma(alpha) / (Gamma(alpha) + Gamma(beta))
    """
    x = _sample_gamma(alpha)
    y = _sample_gamma(beta)
    return x / (x + y)


# ── Context scoring (mirrors rl_engine.compute_context_score) ─────────────────

def compute_context_score(movie: dict, context: dict) -> float:
    score = 0
    if movie.get("primary_mood")   == context.get("mood"): score += 5
    if movie.get("secondary_mood") == context.get("mood"): score += 3
    if movie.get("genre")          == context.get("genre"): score += 4

    raw_movie_kw = movie.get("keywords") or []
    if isinstance(raw_movie_kw, str):
        movie_kw = set(k.strip().lower() for k in raw_movie_kw.split(",") if k.strip())
    else:
        movie_kw = set(k.strip().lower() for k in raw_movie_kw)

    raw_ctx_kw = context.get("keywords") or []
    if isinstance(raw_ctx_kw, str):
        ctx_kw = set(k.strip().lower() for k in raw_ctx_kw.split(",") if k.strip())
    else:
        ctx_kw = set(k.strip().lower() for k in raw_ctx_kw)
        
    score += len(movie_kw & ctx_kw) * 2

    ref = context.get("reference_movie")
    if ref:
        if movie.get("genre")          == ref.get("genre"):         score += 3
        if movie.get("primary_mood")   == ref.get("primary_mood"):  score += 3
        if movie.get("secondary_mood") == ref.get("secondary_mood"): score += 1
        if movie.get("director")       == ref.get("director"):      score += 2
        if movie.get("lead_actor")     == ref.get("lead_actor"):    score += 1
        if movie.get("id")             == ref.get("id"):            score  = -100
    return score


# ── STEP 3: ARM SELECTION ────────────────────────────────────────────────────

def select_movie_thompson(movies: list, context: dict) -> tuple:
    """
    For each movie:
      1. Derive Beta params from stored history
      2. Sample θ ~ Beta(alpha, beta)
      3. combined = θ × (1 + contextBoost) + contextScore × 0.05
    Returns (best_movie, metadata_dict).
    """
    best_movie = None
    best_score = -float("inf")
    best_meta  = {}

    for movie in movies:
        params = init_beta_params(movie)
        alpha  = params["alpha"]
        beta   = params["beta"]

        theta         = sample_beta(alpha, beta)
        context_score = compute_context_score(movie, context)

        # contextBoost: normalise context score → [0.1, ~∞) to weight exploration
        context_boost = max(0.1, context_score / 10.0)
        combined      = theta * (1.0 + context_boost) + context_score * 0.05

        if combined > best_score:
            best_score = combined
            best_movie = movie
            best_meta  = {
                "theta":         theta,
                "alpha":         alpha,
                "beta":          beta,
                "context_score": context_score,
            }

    return best_movie, best_meta


# ── EXPLANATION ──────────────────────────────────────────────────────────────

def generate_explanation(movie: dict, context: dict,
                         theta: float, alpha: int, beta: int) -> str:
    reasons = []

    if context.get("mood"):
        if movie.get("primary_mood") == context["mood"]:
            reasons.append(f'it perfectly matches your "{context["mood"].lower()}" mood')
        elif movie.get("secondary_mood") == context["mood"]:
            reasons.append(f'it carries "{context["mood"].lower()}" undertones matching your mood')

    ref = context.get("reference_movie")
    if ref:
        if movie.get("genre") == ref.get("genre"):
            reasons.append(
                f'it shares the {(movie.get("genre") or "").lower()} genre with "{ref.get("title")}"'
            )
        if movie.get("director") == ref.get("director"):
            reasons.append(f"it's by the same director, {movie.get('director')}")

    total = alpha + beta - 2   # subtract priors
    success_rate = round((alpha - 1) / max(1, total) * 100) if total > 0 else 50
    if alpha + beta > 3:
        reasons.append(
            f"its Bayesian success rate is ~{success_rate}% (α={alpha}, β={beta})"
        )

    if (movie.get("imdb_rating") or 0) >= 8.0:
        reasons.append(
            f"it's critically acclaimed with an IMDb rating of {movie.get('imdb_rating')}"
        )

    reasons.append(
        f"Thompson Sampling drew θ={theta:.3f} from Beta({alpha}, {beta})"
    )

    return f"This movie was recommended because {', '.join(reasons)}."


def update(movie, reward):
    """Update movie stats in-place (used for simulation and internal logic)."""
    current_reward = movie.get("reward_score") or 0
    current_count = movie.get("recommend_count") or 0
    movie["reward_score"] = current_reward + reward
    movie["recommend_count"] = current_count + 1