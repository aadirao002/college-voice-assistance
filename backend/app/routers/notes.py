from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Note
from app.schemas import NoteCreate, NoteOut

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut])
def list_notes(db: Session = Depends(get_db)):
    return db.query(Note).order_by(Note.created_at.desc()).limit(100).all()


@router.post("", response_model=NoteOut)
def create_note(payload: NoteCreate, db: Session = Depends(get_db)):
    n = Note(title=payload.title or "Untitled", body=payload.body)
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    n = db.get(Note, note_id)
    if not n:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(n)
    db.commit()
    return {"ok": True}
