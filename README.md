# Telugu RL Movie Recommendation System

A full-stack movie recommender built with React, Vite, FastAPI, and SQLite. It supports mood-, movie-, and sentence-based recommendations using epsilon-greedy and Thompson Sampling reinforcement-learning engines.

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer

## Start the backend

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The database is created at `backend/telugu_rl.db`. The movie data is seeded automatically on the first start. API documentation is available at `http://127.0.0.1:8000/docs`.

## Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Configuration

Copy `.env.example` to `.env` and set values before production use. Environment variables:

- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: admin login
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_EMAIL`, `SMTP_APP_PASSWORD`: OTP email
- `CORS_ORIGINS`: comma-separated frontend origins
- `DATABASE_PATH`: SQLite database location
- `VITE_API_URL` in the frontend: backend API base URL (default `http://localhost:8000/api`)

## Tests

```powershell
cd frontend
npm test
npm run build
```

## Main features

- Mood, movie reference, and sentence-based recommendations
- Epsilon-greedy and Thompson Sampling engines
- User feedback and learning statistics
- Movie browsing with search, genre, and mood filters
- Analytics dashboard
- Admin login, movie management, and RL data reset
