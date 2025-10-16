FROM python:3.11-slim
WORKDIR /app

COPY app/services/ai-gateway-8023/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY app/services/ai-gateway-8023/app ./app
COPY app/services/shared ./services/shared

ENV PYTHONPATH=/app:${PYTHONPATH}

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8023"]
