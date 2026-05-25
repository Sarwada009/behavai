import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), index=True)
    date_of_birth: Mapped[date] = mapped_column(Date)
    room_number: Mapped[str] = mapped_column(String(20))
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Stored as JSON arrays, e.g. ["loud noises", "strangers"]
    known_triggers: Mapped[list] = mapped_column(JSON, default=list)
    # [{"name": "Donepezil", "dose": "5mg", "frequency": "once daily"}]
    medications: Mapped[list] = mapped_column(JSON, default=list)
    care_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 512-dim Facenet embedding stored as JSON float array; null until a photo is uploaded
    face_embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)
    assigned_staff_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    assigned_staff = relationship("User", foreign_keys=[assigned_staff_id])
    health_history = relationship("HealthHistory", back_populates="patient", cascade="all, delete-orphan")
