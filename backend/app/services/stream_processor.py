"""
Per-camera RTSP stream worker (Phase 2 + 3).

Each worker runs in its own thread and processes one sampled frame every
SAMPLE_INTERVAL_SEC. Per frame it:
  1. Runs face recognition  → emits "presence" event
  2. Runs pose analysis     → emits "behavior" event

Both events are put into a shared thread-safe queue. The StreamManager's async
broadcaster drains the queue and handles persistence + notifications.

Face recognition fallback: if no face is recognised, the worker looks up the
patient assigned to its room (for single-occupancy rooms) so behaviour scoring
still works when the patient's face is turned away.
"""

import logging
import queue
import threading
import time
from datetime import datetime, timezone
from typing import Callable, Optional

import cv2
import numpy as np

from app.services.behavior_analyzer import BehaviorAnalyzer
from app.services.face_service import find_match, generate_embedding_from_frame

logger = logging.getLogger(__name__)

SAMPLE_INTERVAL_SEC  = 3
RECONNECT_DELAY_SEC  = 10


class StreamWorker(threading.Thread):
    def __init__(
        self,
        camera_id: str,
        camera_name: str,
        room_number: str,
        rtsp_url: str,
        event_queue: queue.Queue,
        get_candidates_fn: Callable,       # () → list[{patient_id, patient_name, embedding}]
        get_room_patient_fn: Callable,     # (room_number) → {patient_id, patient_name} | None
    ):
        super().__init__(daemon=True, name=f"stream-{camera_id[:8]}")
        self.camera_id           = camera_id
        self.camera_name         = camera_name
        self.room_number         = room_number
        self.rtsp_url            = rtsp_url
        self.event_queue         = event_queue
        self.get_candidates      = get_candidates_fn
        self.get_room_patient    = get_room_patient_fn
        self._stop_event         = threading.Event()
        self._analyzer: Optional[BehaviorAnalyzer] = None

    def stop(self):
        self._stop_event.set()

    def run(self):
        logger.info("Stream worker starting: %s (%s)", self.camera_name, self.rtsp_url)
        self._analyzer = BehaviorAnalyzer()
        try:
            while not self._stop_event.is_set():
                self._capture_loop()
                if not self._stop_event.is_set():
                    logger.warning(
                        "Stream %s lost, reconnecting in %ds",
                        self.camera_name, RECONNECT_DELAY_SEC
                    )
                    time.sleep(RECONNECT_DELAY_SEC)
        finally:
            if self._analyzer:
                self._analyzer.close()
            logger.info("Stream worker stopped: %s", self.camera_name)

    # ------------------------------------------------------------------
    # Capture loop
    # ------------------------------------------------------------------

    def _capture_loop(self):
        cap = cv2.VideoCapture(self.rtsp_url)
        if not cap.isOpened():
            logger.error("Cannot open stream: %s", self.rtsp_url)
            return

        last_processed = 0.0
        try:
            while not self._stop_event.is_set():
                ret, frame = cap.read()
                if not ret:
                    break
                now = time.monotonic()
                if now - last_processed >= SAMPLE_INTERVAL_SEC:
                    last_processed = now
                    self._process_frame(frame)
        finally:
            cap.release()

    # ------------------------------------------------------------------
    # Per-frame pipeline
    # ------------------------------------------------------------------

    def _process_frame(self, frame: np.ndarray):
        ts = datetime.now(timezone.utc).isoformat()

        # 1. Face recognition
        patient_id   = None
        patient_name = None
        confidence   = 0.0

        face_embedding = generate_embedding_from_frame(frame)
        if face_embedding:
            candidates = self.get_candidates()
            match = find_match(face_embedding, candidates)
            if match:
                patient_id, confidence = match
                patient_name = next(
                    (c["patient_name"] for c in candidates if c["patient_id"] == patient_id),
                    "Unknown",
                )
                self._emit({
                    "type":         "presence",
                    "patient_id":   patient_id,
                    "patient_name": patient_name,
                    "camera_id":    self.camera_id,
                    "room_number":  self.room_number,
                    "confidence":   confidence,
                    "timestamp":    ts,
                })

        # 2. Fallback: attribute behaviour to the room's assigned patient
        if patient_id is None:
            room_patient = self.get_room_patient(self.room_number)
            if room_patient:
                patient_id   = room_patient["patient_id"]
                patient_name = room_patient["patient_name"]

        # 3. Behaviour / pose analysis
        if patient_id and self._analyzer:
            score = self._analyzer.analyze(frame)
            if score is not None:
                self._emit({
                    "type":          "behavior",
                    "patient_id":    patient_id,
                    "patient_name":  patient_name,
                    "camera_id":     self.camera_id,
                    "room_number":   self.room_number,
                    "agitation_score": round(score, 1),
                    "timestamp":     ts,
                })

    def _emit(self, event: dict):
        try:
            self.event_queue.put_nowait(event)
        except queue.Full:
            pass  # Non-critical; drop under saturation
