from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Note, Reminder, TimetableEntry
from app.schemas import AssistantMessage, AssistantResponse, ClientAction, NoteOut
from app.services.assistant_service import run_assistant

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _build_context(db: Session) -> str:
    now = datetime.utcnow()
    soon = now + timedelta(days=3)
    rems = (
        db.query(Reminder)
        .filter(Reminder.done.is_(False), Reminder.due_at <= soon)
        .order_by(Reminder.due_at.asc())
        .limit(8)
        .all()
    )
    lines: list[str] = []
    if rems:
        lines.append("Upcoming reminders:")
        for r in rems:
            lines.append(f"- {r.due_at.isoformat()}Z — {r.text}")
    weekday = now.weekday()
    slots = (
        db.query(TimetableEntry)
        .filter(TimetableEntry.day_of_week == weekday)
        .order_by(TimetableEntry.start_time.asc())
        .all()
    )
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    if slots:
        lines.append(f"Today's timetable ({day_names[weekday]}):")
        for s in slots:
            loc = f" @ {s.location}" if s.location else ""
            lines.append(f"- {s.start_time}-{s.end_time}: {s.title}{loc}")
    return "\n".join(lines) if lines else ""


@router.post("/chat", response_model=AssistantResponse)
def chat(payload: AssistantMessage, db: Session = Depends(get_db)):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    ctx = _build_context(db)
    try:
        out = run_assistant(payload.text.strip(), ctx)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI error: {e!s}") from e
    actions = [ClientAction(**a) for a in out["actions"]]
    return AssistantResponse(reply=out["reply"], actions=actions)


@router.post("/quick-note", response_model=NoteOut)
def quick_note(payload: AssistantMessage, db: Session = Depends(get_db)):
    t = payload.text.strip()
    if not t:
        raise HTTPException(status_code=400, detail="text is required")
    first_line = t.split("\n", 1)[0][:200]
    body = t if len(t) > 200 else t
    note = Note(title=first_line[:80], body=body)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
