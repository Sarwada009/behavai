import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.user import UserOut


class HealthHistoryCreate(BaseModel):
    incident_type: Literal["outburst", "predicted_outburst", "agitation", "general"] = "general"
    severity: int = 1
    agitation_score: int | None = None
    duration_seconds: int | None = None
    notes: str | None = None
    outcome: str | None = None
    occurred_at: datetime | None = None


class HealthHistoryUpdate(BaseModel):
    severity: int | None = None
    notes: str | None = None
    outcome: str | None = None
    acknowledged_at: datetime | None = None


class HealthHistoryOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    incident_type: str
    severity: int
    agitation_score: int | None
    duration_seconds: int | None
    notes: str | None
    outcome: str | None
    recorded_by: UserOut | None
    occurred_at: datetime
    acknowledged_at: datetime | None

    model_config = {"from_attributes": True}
