"""
Emotion detection using DeepFace.
Pre-trained deep neural network for accurate facial emotion recognition.

Emotion multipliers applied to the motion score:
  Angry / Fear / Disgust → 1.2x  (concerning emotions)
  Sad / Neutral           → 1.0x  (no change)
  Happy / Surprise        → 0.3x  (suppresses alert)
"""

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

_EMOTION_MULTIPLIERS = {
    "angry": 1.2,
    "disgust": 1.1,
    "fear": 1.2,
    "neutral": 1.0,
    "sad": 1.0,
    "surprise": 0.5,
    "happy": 0.3,
}

_DEEPFACE_AVAILABLE = False

try:
    from deepface import DeepFace
    _DEEPFACE_AVAILABLE = True
    logger.info("DeepFace loaded successfully for emotion detection")
except Exception as e:
    logger.warning("DeepFace unavailable: %s", str(e))


def get_emotion_multiplier(frame_bgr: np.ndarray) -> tuple[float, str]:
    """
    Detect emotion from face using DeepFace.
    Returns (multiplier, emotion_label).
    """
    try:
        emotion = _detect_emotion(frame_bgr)
        multiplier = _EMOTION_MULTIPLIERS.get(emotion.lower(), 1.0)
        logger.debug("Emotion detected: %s (multiplier: %.2f)", emotion, multiplier)
        return multiplier, emotion
    except Exception as e:
        logger.warning("Emotion detection error: %s. Using neutral.", str(e))
        return 1.0, "Neutral"


def _detect_emotion(frame_bgr: np.ndarray) -> str:
    """
    Detect emotion using DeepFace.
    """
    if not _DEEPFACE_AVAILABLE:
        logger.warning("DeepFace unavailable, using neutral")
        return "Neutral"

    try:
        # DeepFace expects BGR format (which we have)
        # analyze returns a list of dicts with emotion probabilities
        results = DeepFace.analyze(
            frame_bgr,
            actions=["emotion"],
            enforce_detection=False,  # Don't fail if face not detected
            silent=True,
        )

        if results and len(results) > 0:
            # Get the first face's emotions
            emotions = results[0].get("emotion", {})
            if emotions:
                # Pick the emotion with highest confidence
                top_emotion = max(emotions, key=emotions.get)
                logger.debug(f"Emotions detected: {emotions}, top: {top_emotion}")
                return top_emotion.capitalize()

        return "Neutral"

    except Exception as e:
        logger.error("DeepFace inference failed: %s", str(e))
        return "Neutral"
