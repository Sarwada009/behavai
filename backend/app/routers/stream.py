"""
POST /stream/frame

Clients (browser webcam or mobile camera) push a JPEG frame here every few
seconds. The endpoint runs face recognition + pose analysis and returns the
result immediately. Alerts are broadcast via WebSocket and persisted just like
the RTSP pipeline.

Per-user BehaviorAnalyzer instances are kept alive between requests so that
velocity-based scoring works correctly across consecutive frames.
"""

import logging
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.health_history import HealthHistory
from app.models.patient import Patient
from app.models.patient_presence import PatientPresence
from app.services.agitation_tracker import agitation_tracker
from app.services.behavior_analyzer import BehaviorAnalyzer
from app.services.face_service import find_match, get_face_data
from app.models.user import User

logger = logging.getLogger(__name__)

# Try to load emotion detection, but make it optional
try:
    from app.services.emotion_analyzer import get_emotion_multiplier
    EMOTION_DETECTION_AVAILABLE = True
except Exception as e:
    logger.warning("Emotion detection unavailable: %s", str(e))
    EMOTION_DETECTION_AVAILABLE = False
    def get_emotion_multiplier(frame): return (1.0, "Neutral")
router = APIRouter(prefix="/stream", tags=["stream"])

# One thread for CPU-bound ML work per concurrent user
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="frame-worker")


# ---------------------------------------------------------------------------
# Per-user BehaviorAnalyzer registry
# Keeps landmark history alive between consecutive frames from the same user.
# ---------------------------------------------------------------------------

class _AnalyzerRegistry:
    def __init__(self):
        self._analyzers: dict[str, BehaviorAnalyzer] = {}
        self._lock = threading.Lock()

    def get(self, user_id: str) -> BehaviorAnalyzer:
        with self._lock:
            if user_id not in self._analyzers:
                self._analyzers[user_id] = BehaviorAnalyzer()
            return self._analyzers[user_id]

    def release(self, user_id: str):
        with self._lock:
            analyzer = self._analyzers.pop(user_id, None)
            if analyzer:
                try:
                    analyzer.close()
                except Exception:
                    pass


_registry = _AnalyzerRegistry()


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

class FrameResult(BaseModel):
    patient_id: Optional[str]
    patient_name: Optional[str]
    room_number: Optional[str]
    confidence: float
    agitation_score: Optional[float]
    alert_type: Optional[str]      # "outburst" | "predicted_outburst" | None
    face_detected: bool
    emotion: Optional[str]         # e.g. "Anger", "Happiness", "Neutral"
    emotion_multiplier: float      # e.g. 1.5 for angry, 0.3 for happy


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/frame", response_model=FrameResult)
async def process_frame(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = await file.read()
    user_id = str(current_user.id)

    # Run blocking ML work in a thread so the event loop stays free
    import asyncio
    loop = asyncio.get_event_loop()
    result: FrameResult = await loop.run_in_executor(
        _executor, _process_sync, raw, user_id, db
    )

    # Side-effects that need the async context
    if result.alert_type and result.patient_id:
        background_tasks.add_task(
            _handle_alert, result, str(current_user.id)
        )

    return result


# ---------------------------------------------------------------------------
# Synchronous ML pipeline (runs in thread pool)
# ---------------------------------------------------------------------------

def _process_sync(raw_bytes: bytes, user_id: str, db: Session) -> FrameResult:
    # Decode image
    nparr = np.frombuffer(raw_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return FrameResult(
            patient_id=None, patient_name=None, room_number=None,
            confidence=0, agitation_score=None, alert_type=None,
            face_detected=False, emotion=None, emotion_multiplier=1.0,
        )

    patient_id:   Optional[str] = None
    patient_name: Optional[str] = None
    room_number:  Optional[str] = None
    confidence:   float = 0.0
    face_detected = False
    emotion:      Optional[str] = None
    emotion_multiplier: float   = 1.0
    face_bbox:    Optional[list] = None

    # 1. Face recognition
    face_data = get_face_data(frame)
    if face_data is not None:
        face_detected = True
        face_bbox = face_data["bbox"]
        face_emb  = face_data["embedding"]

        patients = (
            db.query(Patient)
            .filter(Patient.face_embedding.isnot(None))
            .all()
        )
        candidates = [
            {"patient_id": str(p.id), "patient_name": p.name, "embedding": p.face_embedding}
            for p in patients
        ]
        match = find_match(face_emb, candidates)
        if match:
            patient_id, confidence = match
            matched = next((p for p in patients if str(p.id) == patient_id), None)
            if matched:
                patient_name = matched.name
                room_number  = matched.room_number

                # Update presence
                try:
                    presence = db.query(PatientPresence).filter(
                        PatientPresence.patient_id == matched.id
                    ).first()
                    if presence:
                        presence.confidence   = confidence
                        presence.last_seen_at = datetime.now(timezone.utc)
                    else:
                        db.add(PatientPresence(
                            patient_id=matched.id, confidence=confidence
                        ))
                    db.commit()
                except Exception:
                    db.rollback()

    # 2. Emotion detection from face crop
    if face_bbox is not None:
        try:
            h, w = frame.shape[:2]
            x1, y1, x2, y2 = (
                max(0, int(face_bbox[0])), max(0, int(face_bbox[1])),
                min(w, int(face_bbox[2])), min(h, int(face_bbox[3])),
            )
            face_crop = frame[y1:y2, x1:x2]
            if face_crop.size > 0:
                emotion_multiplier, emotion = get_emotion_multiplier(face_crop)
                logger.debug(f"Emotion detected: {emotion}, multiplier: {emotion_multiplier}")
        except Exception as e:
            logger.error(f"Emotion detection failed: {e}", exc_info=True)

    # 3. Behaviour analysis — only alert if BOTH angry/scared AND shaking
    score: Optional[float] = None
    alert_type: Optional[str] = None

    if patient_id:
        analyzer  = _registry.get(user_id)
        raw_score = analyzer.analyze(frame)
        if raw_score is not None:
            # Only alert if emotion is concerning (anger, fear, contempt, disgust)
            # AND motion is significant (raw_score >= 50)
            is_concerning_emotion = emotion in ["Anger", "Fear", "Contempt", "Disgust"]
            is_shaking = raw_score >= 50  # Requires significant motion

            if is_concerning_emotion and is_shaking:
                # Apply emotion multiplier only when both conditions met
                score = min(100.0, raw_score * emotion_multiplier)
                logger.debug(f"Alert triggered: emotion={emotion}, raw_motion={raw_score}, final_score={score}")
            else:
                # Show the motion score but don't alert
                score = min(100.0, raw_score * emotion_multiplier)
                logger.debug(f"No alert: emotion={emotion} (concerning={is_concerning_emotion}), motion={raw_score} (shaking={is_shaking})")

            # Only pass to tracker if conditions are met (prevents false positives)
            if is_concerning_emotion and is_shaking:
                alert_event = agitation_tracker.update(
                    patient_id, patient_name or "", room_number or "", score
                )
                if alert_event:
                    alert_type = alert_event["alert_type"]

    return FrameResult(
        patient_id=patient_id,
        patient_name=patient_name,
        room_number=room_number,
        confidence=round(confidence, 3),
        agitation_score=round(score, 1) if score is not None else None,
        alert_type=alert_type,
        face_detected=face_detected,
        emotion=emotion,
        emotion_multiplier=round(emotion_multiplier, 2),
    )


# ---------------------------------------------------------------------------
# Alert side-effects (async, run as background task)
# ---------------------------------------------------------------------------

async def _handle_alert(result: FrameResult, triggered_by_id: str):
    from app.database import SessionLocal
    from app.models.device_token import DeviceToken
    from app.services.notification_service import send_expo_push
    from app.services.ws_manager import ws_manager

    # 1. Broadcast over WebSocket
    await ws_manager.broadcast({
        "type":          "alert",
        "alert_type":    result.alert_type,
        "patient_id":    result.patient_id,
        "patient_name":  result.patient_name,
        "room_number":   result.room_number,
        "agitation_score": result.agitation_score,
        "timestamp":     datetime.now(timezone.utc).isoformat(),
    })

    db = SessionLocal()
    try:
        patient_uuid = uuid.UUID(result.patient_id)

        # 2. Persist health history
        db.add(HealthHistory(
            patient_id      = patient_uuid,
            incident_type   = result.alert_type,
            severity        = 5 if result.alert_type == "outburst" else 3,
            agitation_score = int(result.agitation_score or 0),
            notes           = f"Detected via built-in camera. Score: {result.agitation_score}/100",
            occurred_at     = datetime.now(timezone.utc),
        ))
        db.commit()

        # 3. Push notification to assigned staff
        patient = db.get(Patient, patient_uuid)
        if patient and patient.assigned_staff_id:
            tokens = [
                dt.token for dt in
                db.query(DeviceToken)
                .filter(DeviceToken.user_id == patient.assigned_staff_id)
                .all()
            ]
            await send_expo_push(
                tokens          = tokens,
                patient_name    = result.patient_name or "",
                room_number     = result.room_number or "",
                alert_type      = result.alert_type or "",
                agitation_score = int(result.agitation_score or 0),
                patient_id      = result.patient_id or "",
            )
    except Exception:
        logger.exception("Alert side-effect failed")
        db.rollback()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Debug endpoint: test emotion detection
# ---------------------------------------------------------------------------

class EmotionTestResult(BaseModel):
    emotion: Optional[str]
    multiplier: float
    all_scores: Optional[dict] = None


@router.post("/test-emotion", response_model=EmotionTestResult)
async def test_emotion(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """Test endpoint to debug emotion detection on a single frame."""
    raw = await file.read()
    nparr = np.frombuffer(raw, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return EmotionTestResult(emotion=None, multiplier=1.0)

    try:
        # Test emotion detection
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            _executor, _test_emotion_sync, frame
        )
        return result
    except Exception as e:
        logger.exception("Emotion test failed: %s", str(e))
        return EmotionTestResult(emotion="Error", multiplier=1.0)


def _test_emotion_sync(frame: np.ndarray) -> EmotionTestResult:
    """Synchronous emotion test."""
    try:
        multiplier, emotion = get_emotion_multiplier(frame)
        logger.info(f"Test emotion result: {emotion} (multiplier: {multiplier})")

        # Try to get all scores for debugging
        all_scores = None
        try:
            from app.services.emotion_analyzer import _get_pipeline
            pipeline = _get_pipeline()
            if pipeline:
                from PIL import Image
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                results = pipeline(pil_image)
                all_scores = {r["label"]: r["score"] for r in results}
        except Exception:
            pass

        return EmotionTestResult(
            emotion=emotion,
            multiplier=multiplier,
            all_scores=all_scores
        )
    except Exception as e:
        logger.exception("Emotion test sync failed")
        return EmotionTestResult(emotion="Error", multiplier=1.0)
