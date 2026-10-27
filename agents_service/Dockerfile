FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY agents_service/requirements.txt ./agents_service/requirements.txt
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r agents_service/requirements.txt

# Include repository source so _repo_snapshot() can inspect it. The root
# .dockerignore excludes .env files, runtime data, Git metadata and venvs.
COPY . .

ENV GOOGLE_GENAI_USE_VERTEXAI=true
ENV GOOGLE_CLOUD_LOCATION=europe-west1
EXPOSE 8080
USER app
# Force h11 so the explicit 8 KiB incomplete-event limit is active as defense
# in depth against oversized/malformed HTTP request headers.
CMD ["sh", "-c", "uvicorn agents_service.app:app --host 0.0.0.0 --port ${PORT:-8080} --http h11 --h11-max-incomplete-event-size 8192"]
