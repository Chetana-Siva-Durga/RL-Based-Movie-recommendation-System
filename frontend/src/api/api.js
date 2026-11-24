const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

/**
 * Enhanced fetch wrapper with basic error handling to prevent "hanging" loaders.
 */
async function fetchJSON(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error on ${url}:`, error);
    return { error: true, message: error.message };
  }
}

async function fetchAuthJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed: ${response.status}`);
  return data;
}

export const api = {
  auth: {
    login: (email, password) =>
      fetchAuthJSON(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    forgotPassword: (email) =>
      fetchAuthJSON(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }),
    verifyOTP: (email, otp) =>
      fetchAuthJSON(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      }),
    resetPassword: (email, otp, new_password) =>
      fetchAuthJSON(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password }),
      }),
  },
  movies: {
    list: ({ page = 1, limit = 20, search = '', genre = 'all', mood = 'all' } = {}) => {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      if (genre && genre !== 'all') params.set('genre', genre);
      if (mood && mood !== 'all') params.set('mood', mood);
      return fetchJSON(`${BASE_URL}/movies/?${params}`);
    },

    /** Fetch up to 200 movies (used by movie-search autocomplete). */
    listAll: () =>
      fetchJSON(`${BASE_URL}/movies/?limit=200`),

    /** Create a movie via the Admin panel. */
    create: (data) =>
      fetchJSON(`${BASE_URL}/movies/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    /** Update RL stats (reward_score / recommend_count) after feedback. */
    update: (id, data) =>
      fetchJSON(`${BASE_URL}/movies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    /** Delete a movie via the Admin panel. */
    delete: (id) =>
      fetchJSON(`${BASE_URL}/movies/${id}`, { method: 'DELETE' }),
  },

  /** Centralized RL recommendation — runs Python engine on the backend. */
  recommend: {
    get: (context) =>
      fetchJSON(`${BASE_URL}/recommend/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      }),
  },

  feedback: {
    list: () => fetchJSON(`${BASE_URL}/feedback/`),
    create: (data) =>
      fetchJSON(`${BASE_URL}/feedback/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    reset: () =>
      fetchJSON(`${BASE_URL}/feedback/reset`, { method: 'DELETE' }),
  },

  logs: {
    create: (data) =>
      fetchJSON(`${BASE_URL}/logs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },
};