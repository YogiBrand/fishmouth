# Database Migrations

This project uses **Alembic** for schema migrations.

## Setup

```bash
pip install -r backend/requirements.txt
```

## Creating a Revision

```bash
alembic revision -m "describe change"
```

Edit the generated file in `alembic/versions/` and implement `upgrade()` / `downgrade()`.

## Applying Migrations

```bash
alembic upgrade head
```

To roll back the last migration:

```bash
alembic downgrade -1
```

Ensure the `DATABASE_URL` environment variable is set before running Alembic commands.
