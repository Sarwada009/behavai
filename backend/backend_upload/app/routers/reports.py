"""
GET /reports/patient/{id}?days=30 — generate and stream a PDF incident report.
"""

import uuid
from datetime import datetime, timedelta, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.health_history import HealthHistory
from app.models.patient import Patient
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["reports"])

SEVERITY_LABEL = {1: "Mild", 2: "Low", 3: "Moderate", 4: "High", 5: "Severe"}
TYPE_LABEL = {
    "outburst":           "Outburst",
    "predicted_outburst": "Predicted Outburst",
    "agitation":          "Agitation",
    "general":            "General",
}


@router.get("/patient/{patient_id}")
def patient_report(
    patient_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Patient not found")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    records = (
        db.query(HealthHistory)
        .filter(
            HealthHistory.patient_id == patient_id,
            HealthHistory.occurred_at >= since,
        )
        .order_by(HealthHistory.occurred_at.desc())
        .all()
    )

    pdf_bytes = _build_pdf(patient, records, days)

    safe_name = patient.name.replace(" ", "_")
    filename  = f"incident_report_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_pdf(patient: Patient, records: list[HealthHistory], days: int) -> bytes:
    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()

    # ---- Header ----
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_fill_color(74, 144, 217)
    pdf.set_text_color(255, 255, 255)
    pdf.rect(0, 0, 210, 28, "F")
    pdf.set_xy(10, 8)
    pdf.cell(0, 12, "CareWatch — Incident Report", ln=True)

    pdf.set_text_color(0, 0, 0)
    pdf.ln(6)

    # ---- Patient info ----
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Patient Details", ln=True)
    pdf.set_draw_color(74, 144, 217)
    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    age = datetime.now().year - patient.date_of_birth.year
    info_rows = [
        ("Name",       patient.name),
        ("Age",        f"{age} years"),
        ("Room",       patient.room_number),
        ("Diagnosis",  patient.diagnosis or "Not recorded"),
        ("Report Period", f"Last {days} days"),
        ("Generated",  datetime.now().strftime("%d %b %Y, %H:%M")),
    ]
    pdf.set_font("Helvetica", size=11)
    for label, value in info_rows:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(45, 7, f"{label}:", ln=False)
        pdf.set_font("Helvetica", size=11)
        pdf.cell(0, 7, str(value), ln=True)

    # ---- Summary stats ----
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Summary", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    outbursts   = sum(1 for r in records if r.incident_type == "outburst")
    predicted   = sum(1 for r in records if r.incident_type == "predicted_outburst")
    agitations  = sum(1 for r in records if r.incident_type == "agitation")
    unacked     = sum(1 for r in records if r.acknowledged_at is None)
    avg_score   = (
        sum(r.agitation_score for r in records if r.agitation_score) /
        max(1, sum(1 for r in records if r.agitation_score))
    )

    pdf.set_font("Helvetica", size=11)
    stats = [
        ("Total incidents",         len(records)),
        ("Outbursts",               outbursts),
        ("Predicted outbursts",     predicted),
        ("Agitation episodes",      agitations),
        ("Unacknowledged",          unacked),
        ("Avg agitation score",     f"{avg_score:.1f} / 100"),
    ]
    col_w = 90
    for i, (label, value) in enumerate(stats):
        if i % 2 == 0 and i > 0:
            pdf.ln(0)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(col_w, 7, f"{label}:", ln=False)
        pdf.set_font("Helvetica", size=11)
        pdf.cell(col_w, 7, str(value), ln=(i % 2 == 1))
    pdf.ln(4)

    # ---- Incidents table ----
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Incident Log", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    if not records:
        pdf.set_font("Helvetica", "I", 11)
        pdf.cell(0, 8, "No incidents recorded in this period.", ln=True)
    else:
        # Table header
        headers = ["Date & Time", "Type", "Sev.", "Score", "Staff", "Notes"]
        widths  = [42, 38, 14, 16, 30, 50]
        pdf.set_fill_color(235, 243, 252)
        pdf.set_font("Helvetica", "B", 9)
        for h, w in zip(headers, widths):
            pdf.cell(w, 7, h, border=1, fill=True)
        pdf.ln()

        pdf.set_font("Helvetica", size=8)
        for r in records:
            date_str = r.occurred_at.strftime("%d %b %Y %H:%M")
            type_str = TYPE_LABEL.get(r.incident_type, r.incident_type)
            sev_str  = SEVERITY_LABEL.get(r.severity, str(r.severity))
            score_str = str(r.agitation_score) if r.agitation_score else "—"
            staff_str = r.recorded_by.name if r.recorded_by else "System"
            notes_str = (r.notes or "")[:48]

            row = [date_str, type_str, sev_str, score_str, staff_str, notes_str]
            for val, w in zip(row, widths):
                pdf.cell(w, 6, str(val), border=1)
            pdf.ln()

    # ---- Known triggers ----
    if patient.known_triggers:
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, "Known Triggers", ln=True)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        pdf.set_font("Helvetica", size=11)
        pdf.cell(0, 7, "  •  " + "\n  •  ".join(patient.known_triggers), ln=True)

    # ---- Footer signature line ----
    pdf.ln(10)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(80, 6, "Reviewed by: ____________________________", ln=False)
    pdf.cell(0,  6, f"Date: ________________", ln=True)

    return pdf.output()
