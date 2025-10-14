# Fish Mouth Deployment Guide

## Prerequisites
- Ubuntu 22.04 LTS server
- Docker & Docker Compose installed
- Domain name pointed to the server (e.g. `fishmouth.io`)
- SSL certificate (Let's Encrypt recommended)

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourcompany/fishmouth.git
cd fishmouth
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
nano .env
```

Required variables:
```env
# Database
DATABASE_URL=postgresql://fishmouth:PASSWORD@postgres:5432/fishmouth
REDIS_URL=redis://redis:6379/0

# AI
ANTHROPIC_API_KEY=sk-ant-...
VAPI_API_KEY=...

# Mapping & Imagery
GOOGLE_MAPS_API_KEY=AIza...
MAPBOX_TOKEN=pk.ey...

# Telnyx
TELNYX_API_KEY=KEY...
TELNYX_PUBLIC_KEY=...
TELNYX_MESSAGING_PROFILE_ID=...
TELNYX_CONNECTION_ID=...
TELNYX_PHONE_NUMBER=+1...
DIRECT_MAIL_API_KEY=
DIRECT_MAIL_API_BASE=https://print-api.mock

# Email
SENDGRID_API_KEY=SG...

# Storage (optional for S3)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=fishmouth-reports
S3_REGION=us-east-1

# App
FRONTEND_URL=https://fishmouth.io
JWT_SECRET_KEY=generate-random-32-char-string
```

### 3. Run Database Migrations
Alembic is configured to discover migrations in both `alembic/versions` and `app/migrations`. Ensure the version locations are exported before running migrations:
```bash
export ALEMBIC_VERSION_LOCATIONS="alembic/versions app/migrations"
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

### 4. Build & Start Services
```bash
docker-compose up -d --build
```

### 5. Seed Demo Data (optional)
```bash
docker-compose exec backend python scripts/seed_mock_data.py
```

### 6. Verify Services
```bash
docker-compose ps
curl https://fishmouth.io/api/health
```

## Monitoring

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f celery_worker
```

### Database Backups
```bash
# Automated daily backups
crontab -e
# Add: 0 2 * * * /path/to/scripts/backup_postgres.sh
```

## Scaling

### Add Workers
```bash
docker-compose up -d --scale celery_worker=4
```

### Load Balancing
Use nginx reverse proxy:
```nginx
upstream backend {
    server backend1:8000;
    server backend2:8000;
}
```

## Troubleshooting

### Reset Database
```bash
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

### Clear Redis Cache
```bash
docker-compose exec redis redis-cli FLUSHALL
```
