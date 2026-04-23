FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY ml-service/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY ml-service/ /app

# Expose port
EXPOSE 5000

# Run Flask app
CMD ["gunicorn", "api:app", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120"]
