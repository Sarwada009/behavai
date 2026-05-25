"""
GET /presence/          — all current patient locations
GET /presence/{patient} — single patient's last known location
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.patient_presence import PatientPresence
from app.models.user import User

router = APIRouter(prefix="/presence", tags=["presence"])


class PresenceOut(BaseModel):
    patient_id: uuid.UUID
    patient_name: str
    camera_id: uuid.UUID | None
    room_number: str | None
    confidence: float
    last_seen_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[PresenceOut])
def all_presence(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    records = db.query(PatientPresence).all()
    return [
        PresenceOut(
            patient_id=r.patient_id,
            patient_name=r.patient.name if r.patient else "Unknown",
            camera_id=r.camera_id,
            room_number=r.camera.room_number if r.camera else None,
            confidence=r.confidence,
            last_seen_at=r.last_seen_at,
        )
        for r in records
    ]


@router.get("/{patient_id}", response_model=PresenceOut | None)
def patient_presence(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    r = db.query(PatientPresence).filter(PatientPresence.patient_id == patient_id).first()
    if not r:
        return None
    return PresenceOut(
        patient_id=r.patient_id,
        patient_name=r.patient.name if r.patient else "Unknown",
        camera_id=r.camera_id,
        room_number=r.camera.room_number if r.camera else None,
        confidence=r.confidence,
        last_seen_at=r.last_seen_at,
    )
