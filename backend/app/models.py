from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    text: Mapped[str] = mapped_column(String(500))
    due_at: Mapped[datetime] = mapped_column(DateTime)
    done: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TimetableEntry(Base):
    __tablename__ = "timetable"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0=Monday .. 6=Sunday
    start_time: Mapped[str] = mapped_column(String(8))  # HH:MM
    end_time: Mapped[str] = mapped_column(String(8))
    title: Mapped[str] = mapped_column(String(200))
    location: Mapped[str] = mapped_column(String(200), default="")
