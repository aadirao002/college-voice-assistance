from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import TimetableEntry
from app.schemas import TimetableCreate, TimetableOut

router = APIRouter(prefix="/timetable", tags=["timetable"])


@router.get("", response_model=list[TimetableOut])
def list_timetable(db: Session = Depends(get_db)):
    return (
        db.query(TimetableEntry)
        .order_by(TimetableEntry.day_of_week.asc(), TimetableEntry.start_time.asc())
        .all()
    )


@router.post("", response_model=TimetableOut)
def add_slot(payload: TimetableCreate, db: Session = Depends(get_db)):
    e = TimetableEntry(
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        title=payload.title,
        location=payload.location or "",
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/{entry_id}")
def delete_slot(entry_id: int, db: Session = Depends(get_db)):
    e = db.get(TimetableEntry, entry_id)
    if not e:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(e)
    db.commit()
    return {"ok": True}
