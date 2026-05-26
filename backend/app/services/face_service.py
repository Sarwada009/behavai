"""
Face embedding generation and matching using InsightFace (buffalo_sc model).

Replaces deepface/TensorFlow with a much lighter ONNX-based model (~30 MB).

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


def _get_face_app():
    global _face_app
    if _face_app is None:
        try:
            from insightface.app import FaceAnalysis
            _face_app = FaceAnalysis(
                name="buffalo_sc",                      # small model ~30 MB
                providers=["CPUExecutionProvider"],     # no GPU needed
            )
            _face_app.prepare(ctx_id=0, det_size=(320, 320))
            logger.info("InsightFace model loaded")
        except Exception:
            logger.exception("Failed to load InsightFace model")
    return _face_app


def _cosine_distance(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 1.0
    return float(1.0 - np.dot(va, vb) / (na * nb))


def generate_embedding(image_path: str) -> Optional[list[float]]:
    """Generate a face embedding from a patient photo file path."""
    try:
        img = cv2.imread(image_path)
        if img is None:
            logger.warning("Could not read image: %s", image_path)
            return None
        return _embed_frame(img)
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
    """
    try:
        app = _get_face_app()
        if app is None:
            return None
        faces = app.get(frame_bgr)
        if not faces:
            return None
        largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        return {
            "embedding": largest.embedding.tolist(),
            "bbox": largest.bbox.tolist(),   # [x1, y1, x2, y2]
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
