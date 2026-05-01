from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from routers import movies, feedback, logs
from routers import recommend
from routers import auth

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database initialization error: {e}")

app = FastAPI(title="Telugu RL Recommender API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)