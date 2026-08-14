import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import Base, engine, get_db
from app import models  # noqa: F401  (ensures models are registered before create_all)
from app.routers import auth, documents, chat, exam, revision, recommend, analytics, share, topics, study_plans

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="AI Learning OS — a personal AI second brain for students. "
                 "Free, local-first, open-source (FastAPI + LangChain + Ollama + ChromaDB).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(topics.router)
app.include_router(chat.router)
app.include_router(exam.router)
app.include_router(revision.router)
app.include_router(recommend.router)
app.include_router(analytics.router)
app.include_router(share.router)
app.include_router(study_plans.router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "docs": "/docs",
    }


from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    # Check Database connection (wakes up Serverless DBs)
    db_status = "offline"
    try:
        db.execute(text("SELECT 1"))
        db_status = "online"
    except Exception:
        pass
        
    ai_status = "offline"
    if settings.GROQ_API_KEY or settings.GEMINI_API_KEY:
        ai_status = "online"
        
    return {"status": "ok", "db_status": db_status, "ai_status": ai_status}


# ---------------------------------------------------------------------------
# Single-container deployment support (used on Hugging Face Spaces):
# if a built React app is present at backend/static, serve it and let any
# non-/api route fall through to index.html for client-side routing.
# ---------------------------------------------------------------------------
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        index_path = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index_path)


