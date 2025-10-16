FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    libpng-dev \
    libfreetype6-dev \
    libopenjp2-7 \
    libtiff6 \
    libwebp-dev \
  && rm -rf /var/lib/apt/lists/*

COPY app/services/vision-8024/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend
COPY app/services/vision-8024/app ./app
COPY app/services/__init__.py ./services/__init__.py
COPY app/services/shared ./services/shared

ENV PYTHONPATH=/app:/app/backend:${PYTHONPATH}

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8024"]
