// Contextual Multi-Armed Bandit Recommendation Engine
// ε-Greedy policy with contextual state matching

const EPSILON_DEFAULT = 0.3;
const EPSILON_MIN = 0.05;
const DECAY_RATE = 0.995;

// εnew = εold * decay_rate  //how quickly the agebt starts exploiting than exploing

// Compute relevance score for a movie given context
function computeContextScore(movie, context) {
  let score = 0;

  // Mood matching
  if (context.mood) {
    if (movie.primary_mood === context.mood) score += 5;
    if (movie.secondary_mood === context.mood) score += 3;
  }

  // Genre matching
  if (context.genre) {
    if (movie.genre === context.genre) score += 4;
  }

  // Keyword matching
  if (context.keywords && movie.keywords) {
    const movieKeywords = movie.keywords.toLowerCase().split(',').map(k => k.trim());
    const contextKeywords = context.keywords.toLowerCase().split(',').map(k => k.trim());
    const overlap = movieKeywords.filter(k => contextKeywords.some(ck => k.includes(ck) || ck.includes(k)));
    score += overlap.length * 2;
  }

  // Movie similarity (when input is a movie name)
  if (context.referenceMovie) {
    const ref = context.referenceMovie;
    if (movie.genre === ref.genre) score += 3;
    if (movie.primary_mood === ref.primary_mood) score += 3;
    if (movie.secondary_mood === ref.secondary_mood) score += 1;
    if (movie.director === ref.director) score += 2;
    if (movie.lead_actor === ref.lead_actor) score += 1;
    // Don't recommend the same movie
    if (movie.id === ref.id) score = -100;
  }

  return score;
}

// Compute reward-based exploitation score
function computeExploitScore(movie) {
  if (!movie.recommend_count || movie.recommend_count === 0) return 0;
  return movie.reward_score / movie.recommend_count;
}

// ε-Greedy selection
export function selectMovie(movies, context, sessionCount = 0) {
  if (!movies || movies.length === 0) return null;

  // Decay epsilon over session   
  const epsilon = Math.max(EPSILON_MIN, EPSILON_DEFAULT * Math.pow(DECAY_RATE, sessionCount));
  const isExploration = Math.random() < epsilon;

  if (isExploration) {
    // Exploration: pick random from context-relevant subset
    const contextScores = movies.map(m => ({ movie: m, score: computeContextScore(m, context) }));
    const eligible = contextScores.filter(m => m.score > 0);
    const pool = eligible.length > 0 ? eligible : contextScores;
    const idx = Math.floor(Math.random() * pool.length);
    return { movie: pool[idx].movie, isExploration: true, epsilon, contextScore: pool[idx].score };
  } else {
    // Exploitation: combine context relevance + reward history
    const scored = movies.map(m => {
      const contextScore = computeContextScore(m, context);
      const exploitScore = computeExploitScore(m);
      const combined = contextScore * 0.6 + exploitScore * 3 + (m.popularity || 5) * 0.2;
      return { movie: m, score: combined, contextScore, exploitScore };
    });

    scored.sort((a, b) => b.score - a.score);
    return { movie: scored[0].movie, isExploration: false, epsilon, contextScore: scored[0].contextScore };
  }
}

// Get similar movies
export function getSimilarMovies(movies, targetMovie, limit = 4) {
  if (!targetMovie) return [];
  return movies
    .filter(m => m.id !== targetMovie.id)
    .map(m => ({
      movie: m,
      similarity: computeContextScore(m, {
        mood: targetMovie.primary_mood,
        genre: targetMovie.genre,
        keywords: targetMovie.keywords,
        referenceMovie: targetMovie
      })
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(m => m.movie);
}

// Generate explanation
export function generateExplanation(movie, context, isExploration) {
  const reasons = [];

  if (context.mood) {
    if (movie.primary_mood === context.mood) {
      reasons.push(`it perfectly matches your "${context.mood.toLowerCase()}" mood`);
    } else if (movie.secondary_mood === context.mood) {
      reasons.push(`it carries undertones of "${context.mood.toLowerCase()}" that align with your mood`);
    }
  }

  if (context.referenceMovie) {
    const ref = context.referenceMovie;
    if (movie.genre === ref.genre) reasons.push(`it shares the ${movie.genre.toLowerCase()} genre with "${ref.title}"`);
    if (movie.primary_mood === ref.primary_mood) reasons.push(`it has a similar emotional tone`);
    if (movie.director === ref.director) reasons.push(`it's directed by the same filmmaker, ${movie.director}`);
  }

  if (movie.reward_score > 0 && movie.recommend_count > 0) {
    reasons.push(`it has received positive feedback from users (${Math.round((movie.reward_score / movie.recommend_count) * 100)}% approval)`);
  }

  if (movie.imdb_rating >= 8.0) {
    reasons.push(`it's critically acclaimed with an IMDb rating of ${movie.imdb_rating}`);
  }

  if (isExploration) {
    reasons.push(`the RL agent is exploring new options to discover hidden gems for you`);
  }

  if (reasons.length === 0) {
    reasons.push(`it's a highly popular ${movie.genre.toLowerCase()} Telugu movie`);
  }

  return `This movie was recommended because ${reasons.join(', ')}.`;
}

// Compute reward
export function computeReward(feedback) {
  if (feedback === 'like') return 1;
  if (feedback === 'dislike') return -1;
  return 0;
}