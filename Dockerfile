# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies for OpenCV and YOLOv8
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY backend/requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
# Ensure ultralytics is installed as it's often imported lazily in this project
RUN pip install --no-cache-dir ultralytics

# Copy the backend directory contents into the container at /app/backend
COPY backend/ ./backend/

# The application expects some directories to exist
RUN mkdir -p backend/uploads backend/assets/videos backend/yolo_model

# Expose the port the app runs on
EXPOSE 8000

# Run uvicorn when the container launches
# Using backend.main:app because main.py is inside the backend/ folder
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
