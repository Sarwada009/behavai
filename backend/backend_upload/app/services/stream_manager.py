"""
StreamManager — application singleton that owns all camera worker threads.

Event types handled by the broadcaster:
  "presence"  → update patient_presence table + WS broadcast
  "behavior"  → update AgitationTracker; if alert triggered:
                  • create HealthHistory record
                  • send Expo push to assigned staff
                  • WS broadcast alert event
"""

import asyncio
import logging
import queue
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.camera import Camera
from app.models.device_token import DeviceToken
from app.models.health_history import HealthHistory
from app.models.patient import Patient
from app.models.patient_presence import PatientPresence
from app.services.agitation_tracker import agitation_tracker
from app.services.notification_service import send_expo_push
from app.services.stream_processor import StreamWorker

logger = logging.getLogger(__name__)

EVENT_QUEUE_MAXSIZE = 1000


class StreamManager:
    def __init__(self):
        self._workers: dict[str, StreamWorker] = {}
        self.event_queue: queue.Queue = queue.Queue(maxsize=EVENT_QUEUE_MAXSIZE)
        self._broadcaster_task: Optional[asyncio.Task] = None
        self.ws_manager  = None
        self._db_factory = None

    # ------------------------------------------------------------------
    # Startup / shutdown
    # ------------------------------------------------------------------

    def start(self, db: Session, ws_manager, db_factory):
        self.ws_manager  = ws_manager
        self._db_factory = db_factory
        self._sync_workers(db)
        loop = asyncio.get_event_loop()
        self._broadcaster_task = loop.create_task(self._broadcaster_loop())
        logger.info("StreamManager started")

    def stop(self):
        if self._broadcaster_task:
            self._broadcaster_task.cancel()
        for w in list(self._workers.values()):
            w.stop()
        self._workers.clear()
        logger.info("StreamManager stopped")

    def reload(self, db: Session):
        self._sync_workers(db)

    # ------------------------------------------------------------------
    # Worker lifecycle
    # ------------------------------------------------------------------

    def _sync_workers(self, db: Session):
        active = db.query(Camera).filter(Camera.is_active == True).all()
        active_ids = {str(c.id) for c in active}

        for cid in list(self._workers):
            if cid not in active_ids:
                self._workers[cid].stop()
                del self._workers[cid]

        for camera in active:
            cid = str(camera.id)
            if cid not in self._workers:
                self._launch_worker(camera)

    def _launch_worker(self, camera: Camera):
        cid = str(camera.id)
        worker = StreamWorker(
            camera_id           = cid,
            camera_name         = camera.name,
            room_number         = camera.room_number,
            rtsp_url            = camera.rtsp_url,
            event_queue         = self.event_queue,
            get_candidates_fn   = self._get_candidates,
            get_room_patient_fn = self._get_room_patient,
        )
        worker.start()
        self._workers[cid] = worker
        logger.info("Worker started: %s (room %s)", camera.name, camera.room_number)

    # ------------------------------------------------------------------
    # DB helpers called from worker threads
    # ------------------------------------------------------------------

    def _get_candidates(self) -> list[dict]:
        db: Session = self._db_factory()
        try:
            return [
                {"patient_id": str(p.id), "patient_name": p.name, "embedding": p.face_embedding}
                for p in db.query(Patient).filter(Patient.face_embedding.isnot(None)).all()
            ]
        finally:
            db.close()

    def _get_room_patient(self, room_number: str) -> Optional[dict]:
        """Return the single patient assigned to this room (if unambiguous)."""
        db: Session = self._db_factory()
        try:
            patients = db.query(Patient).filter(Patient.room_number == room_number).all()
            if len(patients) == 1:
                return {"patient_id": str(patients[0].id), "patient_name": patients[0].name}
            return None
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Async broadcaster
    # ------------------------------------------------------------------

    async def _broadcaster_loop(self):
        logger.info("Broadcaster loop started")
        import time as _time
        last_snapshot = _time.monotonic()
        while True:
            try:
                events = []
                while True:
                    try:
                        events.append(self.event_queue.get_nowait())
                    except queue.Empty:
                        break
                for event in events:
                    await self._dispatch(event)

                # Persist agitation score snapshots every 60 s
                now = _time.monotonic()
                if now - last_snapshot >= 60:
                    await self._save_score_snapshots()
                    last_snapshot = now

                await asyncio.sleep(0.5)
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Broadcaster error")
                await asyncio.sleep(1)

    async def _save_score_snapshots(self):
        from app.models.agitation_reading import AgitationReading

        scores = agitation_tracker.all_scores()
        if not scores or not self._db_factory:
            return
        db: Session = self._db_factory()
        try:
            for entry in scores:
                if entry["score"] > 0:
                    db.add(AgitationReading(
                        patient_id=uuid.UUID(entry["patient_id"]),
                        score=entry["score"],
                    ))
            db.commit()
        except Exception:
            logger.exception("Score snapshot failed")
            db.rollback()
        finally:
            db.close()

    async def _dispatch(self, event: dict):
        etype = event.get("type")
        if etype == "presence":
            await self._handle_presence(event)
        elif etype == "behavior":
            await self._handle_behavior(event)

    # ------------------------------------------------------------------
    # Presence event
    # ------------------------------------------------------------------

    async def _handle_presence(self, event: dict):
        if self._db_factory:
            db: Session = self._db_factory()
            try:
                patient_id = uuid.UUID(event["patient_id"])
                camera_id  = uuid.UUID(event["camera_id"])
                presence = db.query(PatientPresence).filter(
                    PatientPresence.patient_id == patient_id
                ).first()
                if presence:
                    presence.camera_id    = camera_id
                    presence.confidence   = event["confidence"]
                    presence.last_seen_at = datetime.now(timezone.utc)
                else:
                    db.add(PatientPresence(
                        patient_id=patient_id, camera_id=camera_id,
                        confidence=event["confidence"]
                    ))
                db.commit()
            except Exception:
                logger.exception("Presence persist failed")
                db.rollback()
            finally:
                db.close()

        if self.ws_manager:
            await self.ws_manager.broadcast(event)

    # ------------------------------------------------------------------
    # Behavior event
    # ------------------------------------------------------------------

    async def _handle_behavior(self, event: dict):
        patient_id   = event["patient_id"]
        patient_name = event["patient_name"]
        room_number  = event["room_number"]
        score        = event["agitation_score"]

        # WS score update to all clients (lightweight, always broadcast)
        if self.ws_manager:
            await self.ws_manager.broadcast(event)

        # Update tracker; get back an alert if threshold crossed
        alert = agitation_tracker.update(patient_id, patient_name, room_number, score)
        if alert is None:
            return

        logger.info(
            "ALERT [%s] %s score=%d room=%s",
            alert["alert_type"], patient_name, score, room_number
        )

        # 1. Persist incident to health history
        await self._create_health_history(alert)

        # 2. Broadcast alert over WebSocket
        if self.ws_manager:
            await self.ws_manager.broadcast(alert)

        # 3. Push notification to assigned staff
        await self._push_alert(alert)

    async def _create_health_history(self, alert: dict):
        if not self._db_factory:
            return
        db: Session = self._db_factory()
        try:
            record = HealthHistory(
                patient_id      = uuid.UUID(alert["patient_id"]),
                incident_type   = alert["alert_type"],
                severity        = 5 if alert["alert_type"] == "outburst" else 3,
                agitation_score = alert["agitation_score"],
                notes           = f"Auto-detected by camera system. Score: {alert['agitation_score']}/100",
                occurred_at     = datetime.now(timezone.utc),
            )
            db.add(record)
            db.commit()
        except Exception:
            logger.exception("Failed to create health history for alert")
            db.rollback()
        finally:
            db.close()

    async def _push_alert(self, alert: dict):
        if not self._db_factory:
            return
        db: Session = self._db_factory()
        try:
            # Find the patient's assigned staff member and get their device tokens
            patient = db.get(Patient, uuid.UUID(alert["patient_id"]))
            if not patient or not patient.assigned_staff_id:
                return
            tokens = [
                dt.token
                for dt in db.query(DeviceToken).filter(
                    DeviceToken.user_id == patient.assigned_staff_id
                ).all()
            ]
        finally:
            db.close()

        await send_expo_push(
            tokens          = tokens,
            patient_name    = alert["patient_name"],
            room_number     = alert["room_number"],
            alert_type      = alert["alert_type"],
            agitation_score = alert["agitation_score"],
            patient_id      = alert["patient_id"],
        )


# Singleton
stream_manager = StreamManager()
