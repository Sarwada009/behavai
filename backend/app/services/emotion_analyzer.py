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
    Falls back to (1.0, 'neutral') if anything goes wrong.
    """
    try:
        rec = _get_recognizer()
        if rec is None:
            return 1.0, "neutral"

        emotion_label, _scores = rec.predict_emotions(face_crop_bgr, logits=False)

        if emotion_label in _EMOTION_LABELS:
            idx = _EMOTION_LABELS.index(emotion_label)
            return _EMOTION_MULTIPLIERS[idx], emotion_label

        return 1.0, emotion_label

    except Exception:
        logger.exception("Emotion detection error")
        return 1.0, "neutral"
