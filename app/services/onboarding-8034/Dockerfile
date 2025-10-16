FROM python:3.11-slim
WORKDIR /app
COPY app/services/onboarding-8034/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY app/services/onboarding-8034/app ./app
ENV SERVICE_NAME=8034
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8034"]
