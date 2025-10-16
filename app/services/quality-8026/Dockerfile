FROM python:3.11-slim
WORKDIR /app

COPY app/services/quality-8026/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend
COPY app/services/quality-8026/app ./app
COPY app/services/__init__.py ./services/__init__.py
COPY app/services/shared ./services/shared

ENV PYTHONPATH=/app:/app/backend:${PYTHONPATH}

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8026"]
