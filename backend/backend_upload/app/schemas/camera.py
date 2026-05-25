import uuid
from datetime import datetime

from pydantic import BaseModel


class CameraCreate(BaseModel):
    name: str
    room_number: str
    rtsp_url: str
    is_active: bool = True


class CameraUpdate(BaseModel):
    name: str | None = None
    room_number: str | None = None
    rtsp_url: str | None = None
    is_active: bool | None = None


class CameraOut(BaseModel):
    id: uuid.UUID
    name: str
    room_number: str
    rtsp_url: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PresenceEvent(BaseModel):
    """Broadcast over WebSocket when a patient is identified in a camera frame."""
    patient_id: str
    patient_name: str
    camera_id: str
    room_number: str
    confidence: float
    timestamp: str
