FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (helpful for PDF processing in case of future libraries)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpoppler-cpp-dev \
    pkg-config \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port (Render sets PORT env variable automatically, but defaults to 10000)
ENV PORT=10000
EXPOSE $PORT

# Run the application
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
