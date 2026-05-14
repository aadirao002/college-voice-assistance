from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Reminder
from app.schemas import ReminderCreate, ReminderOut

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderOut])
def list_reminders(include_done: bool = False, db: Session = Depends(get_db)):
    q = db.query(Reminder).order_by(Reminder.due_at.asc())
    if not include_done:
        q = q.filter(Reminder.done.is_(False))
    return q.limit(200).all()


@router.post("", response_model=ReminderOut)
def create_reminder(payload: ReminderCreate, db: Session = Depends(get_db)):
    r = Reminder(text=payload.text, due_at=payload.due_at)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.patch("/{rid}/done")
def mark_done(rid: int, db: Session = Depends(get_db)):
    r = db.get(Reminder, rid)
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    r.done = True
    db.commit()
    return {"ok": True}


@router.delete("/{rid}")
def delete_reminder(rid: int, db: Session = Depends(get_db)):
    r = db.get(Reminder, rid)
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(r)
    db.commit()
    return {"ok": True}
