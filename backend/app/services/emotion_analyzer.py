"""
Emotion detection using Hugging Face Vision Transformer.
Uses pre-trained model fine-tuned on facial emotions.

Emotion multipliers applied to the motion score:
  Anger / Contempt / Fear / Disgust → 1.2x  (concerning emotions)
  Neutral / Sad                      → 1.0x  (no change)
  Happy / Surprise                   → 0.3x  (suppresses alert)
"""

import logging
from typing import Optional

import cv2
import numpy as np
from PIL import Image
from transformers import pipeline

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

# Load model once at startup
_emotion_pipeline = None


def _get_pipeline():
    """Lazy-load emotion detection pipeline."""
    global _emotion_pipeline
    if _emotion_pipeline is None:
        try:
            _emotion_pipeline = pipeline(
                "image-classification",
                model="nateraw/vit-base-patch16-224-in21k_finetuned_emotions",
                device=0 if _has_cuda() else -1,
            )
            logger.info("Emotion detection model loaded successfully")
        except Exception as e:
            logger.warning("Failed to load emotion model: %s", str(e))
            _emotion_pipeline = False
    return _emotion_pipeline if _emotion_pipeline else None


def _has_cuda():
    """Check if CUDA is available."""
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


def get_emotion_multiplier(frame_bgr: np.ndarray) -> tuple[float, str]:
    """
    Detect emotion from face crop using Vision Transformer.
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
    Detect emotion using Hugging Face Vision Transformer.
    """
    pipeline = _get_pipeline()
    if not pipeline:
        logger.warning("Emotion pipeline unavailable, using neutral")
        return "Neutral"

    try:
        # Convert BGR to RGB for PIL
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)

        # Run inference
        results = pipeline(pil_image)

        # results is a list of dicts: [{"label": "happy", "score": 0.95}, ...]
        # Pick the highest confidence emotion
        if results:
            top_emotion = results[0]["label"]
            # Capitalize for consistency with multipliers
            return top_emotion.capitalize()

        return "Neutral"

    except Exception as e:
        logger.error("Emotion inference failed: %s", str(e))
        return "Neutral"
