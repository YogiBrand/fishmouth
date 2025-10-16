import os, psycopg2, uuid, datetime as dt
db = os.getenv("DATABASE_URL","postgresql://postgres:postgres@localhost:5432/fishmouth")
conn = psycopg2.connect(db)
cur = conn.cursor()
uid = uuid.uuid4()
cur.execute("CREATE SCHEMA IF NOT EXISTS analytics;")
cur.execute("INSERT INTO analytics.users(user_id,email,plan,credits,created_at) VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING;", (uid,"demo@roof.example","free",100,dt.datetime.utcnow()))
conn.commit()
print("Seeded analytics.users demo user", uid)
