FROM python:3.12-slim

# Install system dependencies for reportlab, ffmpeg and others
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN useradd -m -U appuser

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set permissions and switch user
RUN chown -R appuser:appuser /app
USER appuser

# Expose the port (FastAPI default is usually 8000, 
# but Easypanel might expect 80 or 8080. We'll set 8000)
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
