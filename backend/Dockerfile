FROM python:3.11-slim-bullseye

WORKDIR /app

# Install system dependencies for OpenCV and numerical computing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    libffi-dev \
    libgomp1 \
    libopenblas0 \
    liblapack3 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgl1 \
    libglvnd0 \
    libglib2.0-0 \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app ./app

# Set OpenCV to use headless backend (no display libraries needed)
ENV OPENCV_VIDEOIO_DEBUG=0
ENV QT_QPA_PLATFORM=offscreen

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
