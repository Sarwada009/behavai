"""
GET /analytics/overview            — ward summary (incident counts, top patients by alerts)
GET /analytics/patient/{id}/trend  — agitation score readings over the last N hours
GET /analytics/patient/{id}/incidents — incident breakdown by type for charts
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.agitation_reading import AgitationReading
from app.models.health_history import HealthHistory
from app.models.patient import Patient
from app.models.user import User
from app.services.agitation_tracker import agitation_tracker

router = APIRouter(prefix="/analytics", tags=["analytics"])


# -----------------------------------------------------------------------
# Overview
# -----------------------------------------------------------------------

class OverviewOut(BaseModel):
    total_patients: int
    incidents_today: int
    incidents_this_week: int
    unacknowledged_alerts: int
    high_agitation_now: int     # patients currently scoring >= 60
    top_patients: list[dict]    # top 5 by incident count this week


@router.get("/overview", response_model=OverviewOut)
def overview(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    now      = datetime.now(timezone.utc)
    today    = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_patients = db.query(func.count(Patient.id)).scalar()

    incidents_today = db.query(func.count(HealthHistory.id)).filter(
        HealthHistory.occurred_at >= today,
        HealthHistory.incident_type.in_(["outburst", "predicted_outburst", "agitation"]),
    ).scalar()

    incidents_this_week = db.query(func.count(HealthHistory.id)).filter(
        HealthHistory.occurred_at >= week_ago,
        HealthHistory.incident_type.in_(["outburst", "predicted_outburst", "agitation"]),
    ).scalar()

    unacknowledged = db.query(func.count(HealthHistory.id)).filter(
        HealthHistory.acknowledged_at.is_(None),
        HealthHistory.incident_type.in_(["outburst", "predicted_outburst"]),
    ).scalar()

    live_scores   = agitation_tracker.all_scores()
    high_now      = sum(1 for s in live_scores if s["score"] >= 60)

    # Top 5 patients by incident count this week
    rows = (
        db.query(Patient.id, Patient.name, func.count(HealthHistory.id).label("cnt"))
        .join(HealthHistory, HealthHistory.patient_id == Patient.id)
        .filter(HealthHistory.occurred_at >= week_ago)
        .group_by(Patient.id, Patient.name)
        .order_by(func.count(HealthHistory.id).desc())
        .limit(5)
        .all()
    )
    top_patients = [{"patient_id": str(r.id), "name": r.name, "incidents": r.cnt} for r in rows]

    return OverviewOut(
        total_patients=total_patients,
        incidents_today=incidents_today,
        incidents_this_week=incidents_this_week,
        unacknowledged_alerts=unacknowledged,
        high_agitation_now=high_now,
        top_patients=top_patients,
    )


# -----------------------------------------------------------------------
# Trend data for a patient
# -----------------------------------------------------------------------

class TrendPoint(BaseModel):
    timestamp: str
    score: float


@router.get("/patient/{patient_id}/trend", response_model=list[TrendPoint])
def patient_trend(
    patient_id: uuid.UUID,
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    readings = (
        db.query(AgitationReading)
        .filter(
            AgitationReading.patient_id == patient_id,
            AgitationReading.recorded_at >= since,
        )
        .order_by(AgitationReading.recorded_at.asc())
        .all()
    )
    return [TrendPoint(timestamp=r.recorded_at.isoformat(), score=r.score) for r in readings]


# -----------------------------------------------------------------------
# Incident breakdown for a patient (for bar/pie charts)
# -----------------------------------------------------------------------

class IncidentBreakdown(BaseModel):
    type: str
    count: int
    avg_severity: float


@router.get("/patient/{patient_id}/incidents", response_model=list[IncidentBreakdown])
def incident_breakdown(
    patient_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            HealthHistory.incident_type,
            func.count(HealthHistory.id).label("cnt"),
            func.avg(HealthHistory.severity).label("avg_sev"),
        )
        .filter(
            HealthHistory.patient_id == patient_id,
            HealthHistory.occurred_at >= since,
        )
        .group_by(HealthHistory.incident_type)
        .all()
    )
    return [
        IncidentBreakdown(type=r.incident_type, count=r.cnt, avg_severity=round(r.avg_sev or 0, 1))
        for r in rows
    ]
