"""
GET /behavior/scores            — live agitation scores for all tracked patients
GET /behavior/scores/{patient}  — single patient score
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.jwt import get_current_user
from app.models.user import User
from app.services.agitation_tracker import agitation_tracker

router = APIRouter(prefix="/behavior", tags=["behavior"])


class ScoreOut(BaseModel):
    patient_id: str
    patient_name: str
    room_number: str
    score: float
    last_alert_type: Optional[str]
    last_alert_at: Optional[str]


@router.get("/scores", response_model=list[ScoreOut])
def all_scores(_: User = Depends(get_current_user)):
    return agitation_tracker.all_scores()


@router.get("/scores/{patient_id}", response_model=Optional[float])
def patient_score(patient_id: uuid.UUID, _: User = Depends(get_current_user)):
    return agitation_tracker.get_score(str(patient_id))
