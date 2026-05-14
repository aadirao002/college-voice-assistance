from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.routers import assistant, notes, reminders, system, timetable

init_db()

app = FastAPI(title="College Voice Assistant API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistant.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")
app.include_router(timetable.router, prefix="/api")
app.include_router(system.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
