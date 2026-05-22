"""
AgitationTracker — maintains per-patient agitation state across frames.

Scoring:
  raw score → EMA smoothed → compared against thresholds

Alert levels:
  PREDICTED  score ≥ 60 AND rising trend over last RISING_WINDOW frames
  ACTIVE     score ≥ 80

Alert cooldown prevents re-alerting the same patient within COOLDOWN_MINUTES.

Thread-safe: update() may be called from multiple worker threads simultaneously.
"""

import logging
import threading
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

ACTIVE_THRESHOLD    = 75     # immediate outburst (only triggered when angry + shaking)
PREDICTED_THRESHOLD = 60     # early warning (rising trend)
RISING_WINDOW       = 5      # how many recent scores must be non-decreasing
COOLDOWN_MINUTES    = 10     # minimum gap between alerts per patient
SCORE_WINDOW        = 30     # rolling window size
EMA_ALPHA           = 0.3    # higher = faster response, lower = smoother


@dataclass
class _PatientState:
    patient_id: str
    patient_name: str
    room_number: str
    raw_scores: deque = field(default_factory=lambda: deque(maxlen=SCORE_WINDOW))
    ema_score: float = 0.0
    last_alert_at: Optional[datetime] = None
    last_alert_type: Optional[str] = None


class AgitationTracker:
    def __init__(self):
        self._states: dict[str, _PatientState] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def update(
        self,
        patient_id: str,
        patient_name: str,
        room_number: str,
        raw_score: float,
    ) -> Optional[dict]:
        """
        Record a new agitation score for a patient.
        Returns an alert event dict if a threshold is crossed, else None.
        """
        with self._lock:
            state = self._get_or_create(patient_id, patient_name, room_number)
            state.raw_scores.append(raw_score)

            # EMA
            if state.ema_score == 0.0:
                state.ema_score = raw_score
            else:
                state.ema_score = EMA_ALPHA * raw_score + (1 - EMA_ALPHA) * state.ema_score

            alert_type = self._check_alert(state)
            if alert_type:
                state.last_alert_at   = datetime.now(timezone.utc)
                state.last_alert_type = alert_type
                return {
                    "type": "alert",
                    "alert_type": alert_type,
                    "patient_id": patient_id,
                    "patient_name": patient_name,
                    "room_number": room_number,
                    "agitation_score": round(state.ema_score),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            return None

    def get_score(self, patient_id: str) -> Optional[float]:
        with self._lock:
            state = self._states.get(patient_id)
            return round(state.ema_score, 1) if state else None

    def all_scores(self) -> list[dict]:
        with self._lock:
            return [
                {
                    "patient_id": s.patient_id,
                    "patient_name": s.patient_name,
                    "room_number": s.room_number,
                    "score": round(s.ema_score, 1),
                    "last_alert_type": s.last_alert_type,
                    "last_alert_at": s.last_alert_at.isoformat() if s.last_alert_at else None,
                }
                for s in self._states.values()
            ]

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _get_or_create(self, patient_id: str, patient_name: str, room_number: str) -> _PatientState:
        if patient_id not in self._states:
            self._states[patient_id] = _PatientState(
                patient_id=patient_id,
                patient_name=patient_name,
                room_number=room_number,
            )
        return self._states[patient_id]

    def _check_alert(self, state: _PatientState) -> Optional[str]:
        # Respect cooldown
        if state.last_alert_at is not None:
            elapsed_min = (datetime.now(timezone.utc) - state.last_alert_at).total_seconds() / 60
            if elapsed_min < COOLDOWN_MINUTES:
                return None

        score = state.ema_score

        # Active outburst — immediate alert
        if score >= ACTIVE_THRESHOLD:
            return "outburst"

        # Predicted — above warning threshold AND consistently rising
        if score >= PREDICTED_THRESHOLD and len(state.raw_scores) >= RISING_WINDOW:
            recent = list(state.raw_scores)[-RISING_WINDOW:]
            if all(recent[i] <= recent[i + 1] for i in range(len(recent) - 1)):
                return "predicted_outburst"

        return None


# Singleton shared across all stream workers
agitation_tracker = AgitationTracker()
