# Database Migrations with Alembic

## Overview

This project uses Alembic for database schema migrations. Alembic provides version control for your database schema, making it easy to upgrade and downgrade your database structure.

## Prerequisites

- PostgreSQL database running
- Python environment with all dependencies installed
- `backend/requirements.txt` dependencies installed

## Directory Structure

```
backend/
├── alembic/
│   ├── versions/          # Migration scripts
│   ├── env.py            # Alembic environment configuration
│   ├── script.py.mako    # Template for new migrations
│   └── README            # Alembic readme
├── alembic.ini           # Alembic configuration
├── models.py             # SQLAlchemy models
└── database.py           # Database connection
```

## Configuration

The database connection is configured in `alembic.ini`:

```ini
sqlalchemy.url = postgresql+psycopg2://fishmouth:fishmouth123@postgres:5432/fishmouth
```

For production, you should use environment variables instead of hardcoding credentials.

## Common Commands

### Check Current Migration State

```bash
cd backend
alembic current
```

This shows which migration version the database is currently at.

### Create a New Migration

When you make changes to your SQLAlchemy models in `models.py`, generate a new migration:

```bash
cd backend
alembic revision --autogenerate -m "description of changes"
```

**Important:** Always review the generated migration file before applying it!

### Apply Migrations (Upgrade)

To upgrade to the latest version:

```bash
cd backend
alembic upgrade head
```

To upgrade to a specific version:

```bash
cd backend
alembic upgrade <revision_id>
```

### Rollback Migrations (Downgrade)

To rollback to a previous version:

```bash
cd backend
alembic downgrade <revision_id>
```

To rollback one version:

```bash
cd backend
alembic downgrade -1
```

### View Migration History

```bash
cd backend
alembic history
```

### Show SQL Without Applying

To see what SQL will be executed without actually running it:

```bash
cd backend
alembic upgrade head --sql
```

## Docker Usage

When running in Docker, prefix commands with `docker exec`:

```bash
# Check current state
docker exec -w /app fishmouth_backend alembic current

# Create new migration
docker exec -w /app fishmouth_backend alembic revision --autogenerate -m "add user preferences"

# Apply migrations
docker exec -w /app fishmouth_backend alembic upgrade head

# View history
docker exec -w /app fishmouth_backend alembic history
```

## Initial Setup

The initial database state has been stamped as baseline:

```bash
alembic stamp head
```

This marks the current schema as revision `6eef61f13528` without making changes.

## Best Practices

### 1. Always Review Auto-Generated Migrations

Alembic's `--autogenerate` is helpful but not perfect. Always review:
- Column type changes
- Foreign key constraints
- Index additions/removals
- Data migrations (not auto-detected)

### 2. Test Migrations

Before applying to production:
1. Test on a development database
2. Verify the migration works
3. Test the downgrade (rollback)

### 3. Never Edit Applied Migrations

Once a migration has been applied to any environment, never edit it. Create a new migration instead.

### 4. Backup Before Upgrading

Always backup your production database before applying migrations:

```bash
pg_dump -U fishmouth -h postgres -d fishmouth > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 5. Use Descriptive Names

```bash
# Good
alembic revision -m "add user email verification fields"

# Bad
alembic revision -m "update users"
```

## Troubleshooting

### Migration Conflicts

If multiple developers create migrations simultaneously:

```bash
# Merge the branches
alembic merge -m "merge heads" <rev1> <rev2>
```

### Reset to Clean State

If you need to start fresh (⚠️ **DESTRUCTIVE**):

```bash
# Drop all tables
docker exec -it fishmouth_backend python -c "from database import engine, Base; Base.metadata.drop_all(engine)"

# Recreate from models
docker exec -it fishmouth_backend python -c "from database import engine, Base; Base.metadata.create_all(engine)"

# Stamp as current
docker exec -w /app fishmouth_backend alembic stamp head
```

### Foreign Key Constraint Errors

If you get FK constraint errors during migration:

```python
# In your migration file, use batch mode:
with op.batch_alter_table('table_name') as batch_op:
    batch_op.drop_constraint('constraint_name', type_='foreignkey')
    batch_op.add_column(sa.Column('new_column', sa.String()))
```

## Integration with Celery

Migrations should be run before starting Celery workers to ensure schema compatibility:

```bash
# 1. Apply migrations
docker exec -w /app fishmouth_backend alembic upgrade head

# 2. Start workers
docker-compose up -d celery_worker
```

## CI/CD Integration

In your deployment pipeline:

```bash
#!/bin/bash
set -e

echo "🔄 Applying database migrations..."
alembic upgrade head

echo "✅ Migrations complete"

echo "🚀 Starting application..."
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Monitoring

Track migration status in your observability stack:

```python
# In your application startup
from alembic import command
from alembic.config import Config

def check_migrations():
    alembic_cfg = Config("alembic.ini")
    current = command.current(alembic_cfg)
    head = command.heads(alembic_cfg)
    
    if current != head:
        logger.warning("Database migrations are not up to date!")
        return False
    return True
```

## Additional Resources

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Documentation](https://www.sqlalchemy.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For issues or questions about migrations, see the main README.md or contact the development team.








