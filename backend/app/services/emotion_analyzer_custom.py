"""
Custom emotion detection using locally trained PyTorch CNN model.

Emotion multipliers applied to the motion score:
  Angry / Fear / Disgust → 1.2x  (concerning emotions)
  Sad / Neutral           → 1.0x  (no change)
  Happy / Surprise        → 0.3x  (suppresses alert)
"""

import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms

logger = logging.getLogger(__name__)

EMOTIONS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]

_EMOTION_MULTIPLIERS = {
    "angry": 1.2,
    "disgust": 1.1,
    "fear": 1.2,
    "neutral": 1.0,
    "sad": 1.0,
    "surprise": 0.5,
    "happy": 0.3,
}

DEVICE = torch.device("cpu")  # Use CPU for compatibility

# Global model cache
_model = None


def _load_model():
    """Load the trained emotion model."""
    global _model
    if _model is not None:
        return _model

    try:
        model_path = Path(__file__).parent / "emotion_model.pth"
        if not model_path.exists():
            logger.warning(f"Model not found at {model_path}")
            return None

        # Create model architecture
        model = models.resnet18(weights=None)
        num_features = model.fc.in_features
        model.fc = nn.Linear(num_features, len(EMOTIONS))

        # Load trained weights
        model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        model.to(DEVICE)
        model.eval()

        logger.info(f"Custom emotion model loaded successfully from {model_path}")
        _model = model
        return model

    except Exception as e:
        logger.error(f"Failed to load custom emotion model: {e}")
        return None


def get_emotion_multiplier(frame_bgr: np.ndarray) -> tuple[float, str]:
    """
    Detect emotion from face using custom trained model.
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
    Detect emotion using custom trained CNN model.
    """
    model = _load_model()
    if model is None:
        logger.warning("Model unavailable, using neutral")
        return "Neutral"

    try:
        # Preprocess frame
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((224, 224)),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ])

        # Convert numpy to tensor
        img_tensor = transform(frame_rgb).unsqueeze(0).to(DEVICE)

        # Inference
        with torch.no_grad():
            outputs = model(img_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            emotion_idx = torch.argmax(probabilities, dim=1).item()
            confidence = probabilities[0, emotion_idx].item()

        emotion = EMOTIONS[emotion_idx]
        logger.debug(f"Emotion: {emotion} (confidence: {confidence:.2%})")

        return emotion.capitalize()

    except Exception as e:
        logger.error(f"Emotion inference failed: {e}", exc_info=True)
        return "Neutral"
