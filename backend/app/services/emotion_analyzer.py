"""
EmotionAnalyzer — detects facial emotion from a face crop.
Uses hsemotion (ONNX-based, no TensorFlow required).

Emotion multipliers applied to the motion score (only when angry + shaking):
  Anger / Fear        → 1.2x  (genuine distress — modest boost)
  Contempt / Disgust  → 1.1x  (negative affect — minimal boost)
  Neutral / Sadness   → 1.0x  (no change, but won't alert anyway)
  Surprise            → 0.5x  (not concerning, won't alert)
  Happiness           → 0.3x  (suppresses, won't alert)
"""

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Must match the order hsemotion uses for enet_b0_8_best_afew
_EMOTION_LABELS      = ['Anger', 'Contempt', 'Disgust', 'Fear',
                        'Happiness', 'Neutral', 'Sadness', 'Surprise']
_EMOTION_MULTIPLIERS = [ 1.2,      1.1,       1.1,      1.2,
                         0.3,      1.0,        1.0,      0.5]

_recognizer = None


def _get_recognizer():
    global _recognizer
    if _recognizer is None:
        try:
            from hsemotion.facial_emotions import HSEmotionRecognizer
            _recognizer = HSEmotionRecognizer(model_name="enet_b0_8_best_afew")
            logger.info("Emotion recognizer loaded (enet_b0_8_best_afew)")
        except Exception:
            logger.exception("Failed to load emotion recognizer — emotion scoring disabled")
    return _recognizer


def get_emotion_multiplier(face_crop_bgr: np.ndarray) -> tuple[float, str]:
    """
    Analyse the face crop and return (multiplier, emotion_label).
    Falls back to simple heuristics if hsemotion fails.
    """
    try:
        rec = _get_recognizer()
        if rec is None:
            logger.debug("Emotion recognizer not available, using heuristic fallback")
            return _detect_emotion_heuristic(face_crop_bgr)

        emotion_label, scores = rec.predict_emotions(face_crop_bgr, logits=False)
        logger.debug("Emotion detected: %s (scores: %s)", emotion_label, scores)

        if emotion_label in _EMOTION_LABELS:
            idx = _EMOTION_LABELS.index(emotion_label)
            return _EMOTION_MULTIPLIERS[idx], emotion_label

        return 1.0, emotion_label

    except Exception as e:
        logger.warning("Emotion detection error: %s. Using heuristic fallback.", str(e))
        return _detect_emotion_heuristic(face_crop_bgr)


def _detect_emotion_heuristic(face_crop_bgr: np.ndarray) -> tuple[float, str]:
    """
    Simple heuristic emotion detection using mouth/smile detection.
    Returns (multiplier, emotion_label).
    """
    try:
        import cv2

        # Try to detect smile using cascade classifier
        smile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_smile.xml'
        )

        if smile_cascade.empty():
            return 1.0, "neutral"

        gray = cv2.cvtColor(face_crop_bgr, cv2.COLOR_BGR2GRAY)
        smiles = smile_cascade.detectMultiScale(gray, scaleFactor=1.8, minNeighbors=20, minSize=(25, 25))

        if len(smiles) > 0:
            logger.debug("Smile detected via cascade classifier")
            return 0.3, "happiness"

        return 1.0, "neutral"
    except Exception as e:
        logger.debug("Heuristic emotion detection failed: %s", str(e))
        return 1.0, "neutral"
