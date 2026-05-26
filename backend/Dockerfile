FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including graphics libraries for OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    libffi-dev \
    libgomp1 \
    libopenblas0 \
    liblapack3 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libdbus-1-3 \
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
