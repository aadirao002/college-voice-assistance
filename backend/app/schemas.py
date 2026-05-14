from datetime import datetime

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str = ""
    body: str = ""


class NoteOut(BaseModel):
    id: int
    title: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ReminderCreate(BaseModel):
    text: str = Field(..., max_length=500)
    due_at: datetime


class ReminderOut(BaseModel):
    id: int
    text: str
    due_at: datetime
    done: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TimetableCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    title: str = Field(..., max_length=200)
    location: str = ""


class TimetableOut(BaseModel):
    id: int
    day_of_week: int
    start_time: str
    end_time: str
    title: str
    location: str

    model_config = {"from_attributes": True}


class AssistantMessage(BaseModel):
    text: str


class ClientAction(BaseModel):
    type: str
    target: str = ""


class AssistantResponse(BaseModel):
    reply: str
    actions: list[ClientAction] = []


class OpenAppRequest(BaseModel):
    app: str
