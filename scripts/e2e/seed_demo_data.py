import os
import uuid
from datetime import datetime

import psycopg2


def main() -> None:
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/fishmouth")
    conn = psycopg2.connect(database_url)
    try:
        with conn, conn.cursor() as cur:
            cur.execute("CREATE SCHEMA IF NOT EXISTS analytics;")
            user_id = uuid.uuid4()
            cur.execute(
                """
                INSERT INTO analytics.users(user_id, email, plan, credits, created_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO NOTHING;
                """,
                (str(user_id), "demo@roof.example", "free", 100, datetime.utcnow()),
            )
            print("Seeded analytics.users demo user", user_id)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
