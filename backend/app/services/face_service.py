"""
Face embedding generation and matching using InsightFace (buffalo_sc model).
Falls back to OpenCV Haar Cascade if InsightFace fails to load.

generate_embedding()         — call when a patient photo is uploaded
generate_embedding_from_frame() — call per camera frame
find_match()                 — compare a detected face against all patients
"""

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

MATCH_THRESHOLD = 0.65  # cosine distance — lower is stricter (increased to be more forgiving)

# InsightFace app is heavy to initialise; create it once and reuse
_face_app = None
_use_insightface = True
_cascade_classifier = None


def _get_cascade_classifier():
    """Load OpenCV Haar Cascade classifier as fallback."""
    global _cascade_classifier
    if _cascade_classifier is None:
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        _cascade_classifier = cv2.CascadeClassifier(cascade_path)
        if _cascade_classifier.empty():
            logger.warning("Failed to load Haar Cascade classifier")
            return None
        logger.info("Haar Cascade classifier loaded as fallback")
    return _cascade_classifier


def _get_face_app():
    global _face_app, _use_insightface
    if not _use_insightface:
        return None

    if _face_app is None:
        try:
            from insightface.app import FaceAnalysis
            _face_app = FaceAnalysis(
                name="buffalo_sc",                      # small model ~30 MB
                providers=["CPUExecutionProvider"],     # no GPU needed
            )
            _face_app.prepare(ctx_id=0, det_size=(320, 320))
            logger.info("InsightFace model loaded")
        except Exception as e:
            logger.warning("Failed to load InsightFace model: %s. Using Haar Cascade fallback.", str(e))
            _use_insightface = False
            _face_app = None
    return _face_app


def _cosine_distance(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 1.0
    return float(1.0 - np.dot(va, vb) / (na * nb))


def generate_embedding(image_path: str) -> Optional[list[float]]:
    """Generate a face embedding from a patient photo file path.
    Returns None if no face detected (will use Haar Cascade fallback in stream).
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            logger.warning("Could not read image: %s", image_path)
            return None
        # Try to generate embedding - if it fails, return None and let stream use Haar Cascade
        data = get_face_data(img)
        if data and data.get("embedding"):
            return data["embedding"]
        return None
    except Exception:
        logger.exception("Error generating embedding for %s", image_path)
        return None


def generate_embedding_from_frame(frame_bgr: np.ndarray) -> Optional[list[float]]:
    """Generate a face embedding from an OpenCV BGR frame."""
    data = get_face_data(frame_bgr)
    return data["embedding"] if data else None


def get_face_data(frame_bgr: np.ndarray) -> Optional[dict]:
    """
    Returns {"embedding": [...], "bbox": [x1, y1, x2, y2]} for the
    largest detected face, or None if no face found.
    Falls back to Haar Cascade if InsightFace is unavailable.
    """
    try:
        app = _get_face_app()
        if app is not None:
            # Use InsightFace
            faces = app.get(frame_bgr)
            if not faces:
                return None
            largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            return {
                "embedding": largest.embedding.tolist(),
                "bbox": largest.bbox.tolist(),   # [x1, y1, x2, y2]
            }
        else:
            # Fallback to Haar Cascade
            cascade = _get_cascade_classifier()
            if cascade is None:
                return None
            gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            if len(faces) == 0:
                return None
            # Get largest face
            largest = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = largest
            return {
                "embedding": None,  # Haar Cascade doesn't provide embeddings
                "bbox": [x, y, x + w, y + h],
            }
    except Exception:
        logger.exception("Error in get_face_data")
        return None


def _embed_frame(frame_bgr: np.ndarray) -> Optional[list[float]]:
    data = get_face_data(frame_bgr)
    return data["embedding"] if data else None


def find_match(
    face_embedding: list[float],
    candidates: list[dict],     # [{"patient_id": str, "embedding": list[float]}]
) -> Optional[tuple[str, float]]:
    """
    Compare face_embedding against all stored patient embeddings.
    Returns (patient_id, confidence) for the best match, or None.
    """
    best_id  = None
    best_dist = float("inf")

    for c in candidates:
        stored = c.get("embedding")
        if not stored:
            continue
        dist = _cosine_distance(face_embedding, stored)
        if dist < best_dist:
            best_dist = dist
            best_id   = c["patient_id"]

    if best_id is not None and best_dist <= MATCH_THRESHOLD:
        confidence = round(1.0 - (best_dist / MATCH_THRESHOLD), 3)
        return best_id, min(confidence, 1.0)

    return None
