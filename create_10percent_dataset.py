#!/usr/bin/env python3
"""
Create 10% subset of emotion dataset for faster training.
Randomly samples 10% from each emotion category.
"""

import os
import random
import shutil
from pathlib import Path

def create_subset():
    source_dir = Path(r"C:\Users\ACER\Downloads\emotionimage")
    output_dir = Path(r"C:\Users\ACER\Downloads\emotionimage_10percent")

    # Create output directories
    train_dir = output_dir / "train"
    test_dir = output_dir / "test"
    train_dir.mkdir(parents=True, exist_ok=True)
    test_dir.mkdir(parents=True, exist_ok=True)

    emotions = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]

    print("Creating 10% subset dataset...")
    total_selected = 0

    # Process train directory
    for emotion in emotions:
        source_emotion_dir = source_dir / "train" / emotion
        if not source_emotion_dir.exists():
            print(f"Warning: {emotion} train directory not found")
            continue

        output_emotion_dir = train_dir / emotion
        output_emotion_dir.mkdir(parents=True, exist_ok=True)

        # List all images
        images = list(source_emotion_dir.glob("*"))
        images = [img for img in images if img.is_file()]

        # Calculate 10% and sample
        sample_size = max(1, len(images) // 10)
        sampled = random.sample(images, sample_size)

        print(f"  {emotion}: {len(images)} -> {sample_size} images")

        # Copy sampled images
        for img in sampled:
            shutil.copy2(img, output_emotion_dir / img.name)

        total_selected += sample_size

    # Process test directory (also take 10%)
    for emotion in emotions:
        source_emotion_dir = source_dir / "test" / emotion
        if not source_emotion_dir.exists():
            continue

        output_emotion_dir = test_dir / emotion
        output_emotion_dir.mkdir(parents=True, exist_ok=True)

        images = list(source_emotion_dir.glob("*"))
        images = [img for img in images if img.is_file()]

        sample_size = max(1, len(images) // 10)
        sampled = random.sample(images, sample_size)

        for img in sampled:
            shutil.copy2(img, output_emotion_dir / img.name)

    print(f"\nTotal images selected: {total_selected}")
    print(f"Dataset created at: {output_dir}")
    return str(output_dir)

if __name__ == "__main__":
    create_subset()
