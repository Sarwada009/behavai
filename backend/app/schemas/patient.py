import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.user import UserOut


class PatientCreate(BaseModel):
    name: str
    date_of_birth: date
    room_number: str
    diagnosis: str | None = None
    known_triggers: list[str] = []
    medications: list[dict[str, Any]] = []
    care_notes: str | None = None
    assigned_staff_id: uuid.UUID | None = None


class PatientUpdate(BaseModel):
    name: str | None = None
    date_of_birth: date | None = None
    room_number: str | None = None
    diagnosis: str | None = None
    known_triggers: list[str] | None = None
    medications: list[dict[str, Any]] | None = None
    care_notes: str | None = None
    assigned_staff_id: uuid.UUID | None = None


class PatientOut(BaseModel):
    id: uuid.UUID
    name: str
    date_of_birth: date
    room_number: str
    photo_url: str | None
    diagnosis: str | None
    known_triggers: list[str]
    medications: list[dict[str, Any]]
    care_notes: str | None
    assigned_staff_id: uuid.UUID | None
    assigned_staff: UserOut | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PatientSummary(BaseModel):
    """Lightweight version for list views."""
    id: uuid.UUID
    name: str
    room_number: str
    photo_url: str | None
    diagnosis: str | None
    assigned_staff: UserOut | None

    model_config = {"from_attributes": True}
