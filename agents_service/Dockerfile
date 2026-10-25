FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./agents_service

ENV GOOGLE_GENAI_USE_VERTEXAI=1
ENV GOOGLE_CLOUD_LOCATION=us-central1
ENV AGENTS_PORT=8080
EXPOSE 8080
USER app
CMD ["sh", "-c", "uvicorn agents_service.app:app --host 0.0.0.0 --port ${PORT:-8080}"]
