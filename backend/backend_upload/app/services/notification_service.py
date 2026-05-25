"""
Sends push notifications to staff via the Expo Push API.
No Firebase credentials required — Expo handles delivery for iOS and Android.
"""

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

ALERT_TITLES = {
    "outburst":           "🚨 Outburst Alert",
    "predicted_outburst": "⚠️ Behaviour Warning",
    "agitation":          "ℹ️ Agitation Detected",
}


async def send_expo_push(
    tokens: list[str],
    patient_name: str,
    room_number: str,
    alert_type: str,
    agitation_score: int,
    patient_id: str,
) -> None:
    if not tokens:
        return

    title = ALERT_TITLES.get(alert_type, "CareWatch Alert")
    body  = f"{patient_name} · Room {room_number} · Score {agitation_score}/100"

    messages = [
        {
            "to":    token,
            "title": title,
            "body":  body,
            "sound": "default",
            "priority": "high",
            "data": {
                "patient_id":  patient_id,
                "alert_type":  alert_type,
                "room_number": room_number,
            },
        }
        for token in tokens
        if token.startswith("ExponentPushToken[")
    ]

    if not messages:
        return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                settings.expo_push_url,
                json=messages,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
            resp.raise_for_status()
            logger.info("Expo push sent to %d device(s) for %s", len(messages), patient_name)
    except Exception:
        logger.exception("Expo push failed for patient %s", patient_id)
