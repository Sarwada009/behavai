"""
BehaviorAnalyzer — converts a camera frame into an agitation score 0-100.

Uses OpenCV frame-differencing to measure how much the person is moving.
No MediaPipe required — works with any OpenCV version already installed.

Scoring logic:
  - Compares each frame against the previous frame (grayscale + blur)
  - Counts the % of pixels that changed significantly (threshold > 40)
  - Maps motion % → agitation score 0-100
  - ~10%  motion  → score ~50  (moderate movement - person shifting)
  - ~17%  motion  → score ~85  (vigorous movement - approaching threshold)
  - ~20%+ motion  → score ~100 (outburst-level thrashing)
"""

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class BehaviorAnalyzer:
    def __init__(self):
        self._prev_gray: Optional[np.ndarray] = None

    def analyze(self, frame_bgr: np.ndarray) -> Optional[float]:
        """
        Returns agitation score in [0, 100], or None if analysis fails.
        """
        try:
            gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)

            if self._prev_gray is None:
                self._prev_gray = gray
                return 0.0

            # Pixel-level difference between current and previous frame
            diff = cv2.absdiff(self._prev_gray, gray)
            _, thresh = cv2.threshold(diff, 40, 255, cv2.THRESH_BINARY)  # Increased from 25 to ignore small changes

            # Fraction of pixels that changed
            motion_ratio = float(np.sum(thresh > 0)) / thresh.size

            self._prev_gray = gray

            # Scale: 20% of pixels moving → score 100
            score = min(100.0, motion_ratio * 500.0)
            return score

        except Exception:
            logger.exception("BehaviorAnalyzer error")
            return None

    def close(self):
        self._prev_gray = None
