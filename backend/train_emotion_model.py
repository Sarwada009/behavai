"""
Train a custom emotion detection model using the provided dataset.

Usage:
  python train_emotion_model.py --data-dir /path/to/emotionimage --output model.pth
"""

import argparse
import logging
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import models, transforms
from torchvision.datasets import ImageFolder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EMOTIONS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def create_model(num_classes=7):
    """Create ResNet18 model fine-tuned for emotion detection."""
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, num_classes)
    return model.to(DEVICE)


def create_dataloaders(data_dir, batch_size=32):
    """Create training and test dataloaders."""
    data_dir = Path(data_dir)

    # Image preprocessing
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    train_dataset = ImageFolder(data_dir / "train", transform=transform)
    test_dataset = ImageFolder(data_dir / "test", transform=test_transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=4)

    return train_loader, test_loader


def train_epoch(model, train_loader, criterion, optimizer):
    """Train for one epoch."""
    model.train()
    total_loss = 0
    correct = 0
    total = 0

    for images, labels in train_loader:
        images, labels = images.to(DEVICE), labels.to(DEVICE)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        total += labels.size(0)

    acc = 100.0 * correct / total
    loss_avg = total_loss / len(train_loader)
    return loss_avg, acc


def evaluate(model, test_loader, criterion):
    """Evaluate model on test set."""
    model.eval()
    total_loss = 0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in test_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            outputs = model(images)
            loss = criterion(outputs, labels)

            total_loss += loss.item()
            _, predicted = outputs.max(1)
            correct += predicted.eq(labels).sum().item()
            total += labels.size(0)

    acc = 100.0 * correct / total
    loss_avg = total_loss / len(test_loader)
    return loss_avg, acc


def main():
    parser = argparse.ArgumentParser(description="Train emotion detection model")
    parser.add_argument("--data-dir", required=True, help="Path to emotion image dataset")
    parser.add_argument("--output", default="emotion_model.pth", help="Output model path")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    args = parser.parse_args()

    logger.info(f"Device: {DEVICE}")
    logger.info(f"Data directory: {args.data_dir}")

    # Create dataloaders
    logger.info("Loading dataset...")
    train_loader, test_loader = create_dataloaders(args.data_dir, batch_size=args.batch_size)
    logger.info(f"Training samples: {len(train_loader.dataset)}")
    logger.info(f"Test samples: {len(test_loader.dataset)}")

    # Create model
    logger.info("Creating model...")
    model = create_model(num_classes=len(EMOTIONS))

    # Training setup
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=2
    )

    best_acc = 0
    logger.info(f"Starting training for {args.epochs} epochs...")

    for epoch in range(args.epochs):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer)
        test_loss, test_acc = evaluate(model, test_loader, criterion)

        scheduler.step(test_loss)

        logger.info(
            f"Epoch {epoch+1}/{args.epochs} | "
            f"Train Loss: {train_loss:.4f}, Acc: {train_acc:.2f}% | "
            f"Test Loss: {test_loss:.4f}, Acc: {test_acc:.2f}%"
        )

        if test_acc > best_acc:
            best_acc = test_acc
            torch.save(model.state_dict(), args.output)
            logger.info(f"Saved best model to {args.output} (accuracy: {test_acc:.2f}%)")

    logger.info(f"Training complete! Best test accuracy: {best_acc:.2f}%")
    logger.info(f"Model saved to: {args.output}")


if __name__ == "__main__":
    main()
