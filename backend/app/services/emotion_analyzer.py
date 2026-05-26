"""
EmotionAnalyzer — detects facial emotion from a frame.
Uses DeepFace for more accurate emotion detection.

Emotion multipliers applied to the motion score:
  Anger / Fear        → 1.2x  (genuine distress — modest boost)
  Contempt / Disgust  → 1.1x  (negative affect — minimal boost)
  Neutral / Sad       → 1.0x  (no change)
  Surprise            → 0.5x  (not concerning)
  Happy               → 0.3x  (suppresses alert)
"""

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

_EMOTION_MULTIPLIERS = {
    "angry": 1.2,
    "fear": 1.2,
    "disgust": 1.1,
    "contempt": 1.1,
    "neutral": 1.0,
    "sad": 1.0,
    "sadness": 1.0,
    "surprise": 0.5,
    "happy": 0.3,
    "happiness": 0.3,
}

_deepface_loaded = False


def _load_deepface():
    global _deepface_loaded
    if _deepface_loaded:
        return True
    try:
        import deepface
        _deepface_loaded = True
        logger.info("DeepFace loaded for emotion detection")
        return True
    except Exception as e:
        logger.warning("Failed to load DeepFace: %s", str(e))
        return False


def get_emotion_multiplier(frame_bgr: np.ndarray) -> tuple[float, str]:
    """
    Analyze the frame and return (multiplier, emotion_label).
    Uses DeepFace for accurate emotion detection.
    Falls back to heuristic if DeepFace fails.
    """
    try:
        if not _load_deepface():
            return _detect_emotion_heuristic(frame_bgr)

        from deepface import DeepFace

        # DeepFace analyze returns list of results (one per face)
        results = DeepFace.analyze(frame_bgr, actions=['emotion'], enforce_detection=False)

        if results and len(results) > 0:
            result = results[0]  # Get the first (largest) face
            emotions = result.get('emotion', {})

            if emotions:
                # Get dominant emotion
                dominant_emotion = max(emotions, key=emotions.get)
                logger.debug("Emotion detected: %s (confidence: %.2f)", dominant_emotion, emotions[dominant_emotion])

                # Get multiplier
                multiplier = _EMOTION_MULTIPLIERS.get(dominant_emotion.lower(), 1.0)
                return multiplier, dominant_emotion.capitalize()

        return 1.0, "Neutral"

    except Exception as e:
        logger.warning("DeepFace emotion detection error: %s. Using fallback.", str(e))
        return _detect_emotion_heuristic(frame_bgr)


def _detect_emotion_heuristic(frame_bgr: np.ndarray) -> tuple[float, str]:
    """
    Fallback emotion detection using smile cascade.
    Returns (multiplier, emotion_label).
    """
    try:
        smile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_smile.xml'
        )

        if smile_cascade.empty():
            return 1.0, "Neutral"

        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        smiles = smile_cascade.detectMultiScale(gray, scaleFactor=1.8, minNeighbors=20, minSize=(25, 25))

        if len(smiles) > 0:
            logger.debug("Smile detected via cascade classifier (fallback)")
            return 0.3, "Happiness"

        return 1.0, "Neutral"
    except Exception as e:
        logger.debug("Heuristic emotion detection failed: %s", str(e))
        return 1.0, "Neutral"
