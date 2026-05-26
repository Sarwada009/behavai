"""
EmotionAnalyzer — simple, lightweight emotion detection.
Uses OpenCV face feature analysis (no heavy dependencies).

Emotion multipliers applied to the motion score:
  Anger / Contempt  → 1.2x  (concerning emotions)
  Neutral / Sad     → 1.0x  (no change)
  Happy             → 0.3x  (suppresses alert)
  Surprise          → 0.5x  (not concerning)
"""

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

_EMOTION_MULTIPLIERS = {
    "Anger": 1.2,
    "Contempt": 1.1,
    "Neutral": 1.0,
    "Sadness": 1.0,
    "Happiness": 0.3,
    "Surprise": 0.5,
    "Fear": 1.2,
    "Disgust": 1.1,
}


def get_emotion_multiplier(frame_bgr: np.ndarray) -> tuple[float, str]:
    """
    Lightweight emotion detection using facial feature analysis.
    Returns (multiplier, emotion_label).
    """
    try:
        emotion = _detect_emotion(frame_bgr)
        multiplier = _EMOTION_MULTIPLIERS.get(emotion, 1.0)
        logger.debug("Emotion detected: %s (multiplier: %.2f)", emotion, multiplier)
        return multiplier, emotion
    except Exception as e:
        logger.warning("Emotion detection error: %s. Using neutral.", str(e))
        return 1.0, "Neutral"


def _detect_emotion(frame_bgr: np.ndarray) -> str:
    """
    Simple emotion detection using OpenCV cascade classifiers and face analysis.
    """
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

    # Detect smiles (happiness)
    smile_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_smile.xml'
    )
    if not smile_cascade.empty():
        smiles = smile_cascade.detectMultiScale(
            gray, scaleFactor=1.8, minNeighbors=20, minSize=(25, 25)
        )
        if len(smiles) > 0:
            return "Happiness"

    # Detect eye openness (fear/surprise)
    eye_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_eye.xml'
    )
    if not eye_cascade.empty():
        eyes = eye_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=10)
        # If many eyes detected, might indicate surprise/fear
        if len(eyes) > 4:
            return "Surprise"

    # Check brightness/contrast for anger (darker = more intense)
    brightness = np.mean(gray)
    if brightness < 80:
        return "Anger"

    # Default to neutral
    return "Neutral"
