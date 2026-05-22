import json
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user, require_role
from app.config import settings
from app.database import get_db
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientOut, PatientSummary, PatientUpdate
from app.services.face_service import generate_embedding

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="embedding")

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/", response_model=list[PatientSummary])
def list_patients(
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Patient)
    if search:
        q = q.filter(Patient.name.ilike(f"%{search}%"))
    return q.order_by(Patient.name).all()


@router.post("/", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
async def create_patient(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    room_number: str = Form(...),
    date_of_birth: str | None = Form(None),
    diagnosis: str | None = Form(None),
    medications: str | None = Form(None),
    triggers: str | None = Form(None),
    care_notes: str | None = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "clinician")),
):
    dob = date.today()
    if date_of_birth:
        try:
            dob = date.fromisoformat(date_of_birth)
        except ValueError:
            pass

    known_triggers: list = []
    if triggers:
        try:
            known_triggers = json.loads(triggers)
        except (json.JSONDecodeError, ValueError):
            known_triggers = [t.strip() for t in triggers.split(",") if t.strip()]

    meds: list = []
    if medications:
        try:
            meds = json.loads(medications)
        except (json.JSONDecodeError, ValueError):
            meds = [{"name": m.strip(), "dose": "", "frequency": ""} for m in medications.split(",") if m.strip()]

    patient = Patient(
        name=name,
        room_number=room_number,
        date_of_birth=dob,
        diagnosis=diagnosis or None,
        known_triggers=known_triggers,
        medications=meds,
        care_notes=care_notes or None,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    if photo and photo.filename:
        if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
            raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are accepted")

        os.makedirs(settings.upload_dir, exist_ok=True)
        ext = photo.filename.rsplit(".", 1)[-1]
        filename = f"{patient.id}.{ext}"
        dest = os.path.join(settings.upload_dir, filename)

        async with aiofiles.open(dest, "wb") as out:
            await out.write(await photo.read())

        patient.photo_url = f"/uploads/{filename}"
        db.commit()
        db.refresh(patient)

        background_tasks.add_task(_regenerate_embedding, str(patient.id), dest)

    return patient


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: uuid.UUID,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "clinician")),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()


@router.post("/{patient_id}/photo", response_model=PatientOut)
async def upload_photo(
    patient_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "clinician")),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are accepted")

    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1]
    filename = f"{patient_id}.{ext}"
    dest = os.path.join(settings.upload_dir, filename)

    async with aiofiles.open(dest, "wb") as out:
        await out.write(await file.read())

    patient.photo_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(patient)

    # Generate face embedding in background so the response returns immediately
    background_tasks.add_task(_regenerate_embedding, str(patient_id), dest)

    return patient


def _regenerate_embedding(patient_id: str, image_path: str):
    """Blocking task: generate embedding and persist it."""
    from app.database import SessionLocal

    embedding = generate_embedding(image_path)
    if embedding is None:
        logger.warning("No face detected in uploaded photo for patient %s", patient_id)
        return

    db: Session = SessionLocal()
    try:
        import uuid as _uuid
        patient = db.get(Patient, _uuid.UUID(patient_id))
        if patient:
            patient.face_embedding = embedding
            db.commit()
            logger.info("Face embedding stored for patient %s", patient_id)
    except Exception:
        logger.exception("Failed to store embedding for patient %s", patient_id)
        db.rollback()
    finally:
        db.close()
