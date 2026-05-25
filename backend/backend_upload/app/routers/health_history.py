import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.health_history import HealthHistory
from app.models.patient import Patient
from app.models.user import User
from app.schemas.health_history import HealthHistoryCreate, HealthHistoryOut, HealthHistoryUpdate

router = APIRouter(prefix="/patients/{patient_id}/history", tags=["health-history"])


def _get_patient_or_404(patient_id: uuid.UUID, db: Session) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/", response_model=list[HealthHistoryOut])
def list_history(
    patient_id: uuid.UUID,
    incident_type: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _get_patient_or_404(patient_id, db)
    q = db.query(HealthHistory).filter(HealthHistory.patient_id == patient_id)
    if incident_type:
        q = q.filter(HealthHistory.incident_type == incident_type)
    return q.order_by(HealthHistory.occurred_at.desc()).offset(offset).limit(limit).all()


@router.post("/", response_model=HealthHistoryOut, status_code=status.HTTP_201_CREATED)
def create_history(
    patient_id: uuid.UUID,
    payload: HealthHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_patient_or_404(patient_id, db)
    data = payload.model_dump()
    if data.get("occurred_at") is None:
        data["occurred_at"] = datetime.now(timezone.utc)
    record = HealthHistory(
        patient_id=patient_id,
        recorded_by_id=current_user.id,
        **data,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}", response_model=HealthHistoryOut)
def get_history_record(
    patient_id: uuid.UUID,
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    record = db.query(HealthHistory).filter(
        HealthHistory.id == record_id, HealthHistory.patient_id == patient_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.patch("/{record_id}", response_model=HealthHistoryOut)
def update_history_record(
    patient_id: uuid.UUID,
    record_id: uuid.UUID,
    payload: HealthHistoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    record = db.query(HealthHistory).filter(
        HealthHistory.id == record_id, HealthHistory.patient_id == patient_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.post("/{record_id}/acknowledge", response_model=HealthHistoryOut)
def acknowledge(
    patient_id: uuid.UUID,
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    record = db.query(HealthHistory).filter(
        HealthHistory.id == record_id, HealthHistory.patient_id == patient_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    record.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record
