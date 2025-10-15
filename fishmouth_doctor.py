#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fish Mouth Doctor — end-to-end environment & integrity check.

Usage:
  python tools/doctor/fishmouth_doctor.py --api http://localhost:8000 --db postgresql://... --redis redis://redis:6379/0

If args omitted, attempts to read from .env in repo root.
"""
import os, sys, argparse, json, time
from typing import List, Dict, Any
import re

OK = "✅"
WARN = "⚠️"
ERR = "❌"

def load_env_file(path=".env"):
    data = {}
    if os.path.exists(path):
        for line in open(path, "r", encoding="utf-8").read().splitlines():
            if not line or line.strip().startswith("#"): continue
            m = re.match(r"^([A-Za-z0-9_]+)=(.*)$", line)
            if m:
                k,v = m.group(1), m.group(2)
                data[k]=v
    return data

def http_get(url, timeout=8, headers=None):
    import urllib.request, urllib.error
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.getcode(), resp.read()
    except Exception as e:
        return None, str(e).encode()

def check_api_health(api_base: str) -> List[Dict[str, Any]]:
    checks = []
    for path in ["/healthz", "/readyz", "/openapi.json"]:
        code, body = http_get(api_base.rstrip("/") + path)
        if code and code < 400:
            checks.append({"name": path, "status": OK, "detail": f"HTTP {code}"})
        else:
            checks.append({"name": path, "status": WARN if "openapi" in path else ERR, "detail": f"Failed: {body.decode(errors='ignore')[:200]}"})
    return checks

def require_endpoints(api_base: str, expected: List[str]) -> List[Dict[str, Any]]:
    code, body = http_get(api_base.rstrip("/") + "/openapi.json")
    out = []
    if not code or code >= 400:
        return [{"name":"openapi", "status":ERR, "detail":"Cannot load /openapi.json"}]
    try:
        spec = json.loads(body.decode())
        got = set(spec.get("paths", {}).keys())
        missing = [e for e in expected if e not in got]
        if missing:
            out.append({"name":"OpenAPI endpoints", "status":ERR, "detail":f"Missing: {missing}"})
        else:
            out.append({"name":"OpenAPI endpoints", "status":OK, "detail":f"{len(expected)} required endpoints present"})
    except Exception as e:
        out.append({"name":"openapi-parse", "status":ERR, "detail":str(e)})
    return out

def check_db(db_url: str) -> List[Dict[str, Any]]:
    out=[]
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT postgis_full_version();")
        _ = cur.fetchone()
        out.append({"name":"PostGIS", "status":OK, "detail":"postgis_full_version() ok"})
        tables = ["properties", "leads", "assets", "property_images", "scan_jobs", "scan_results", "events", "outbox_messages", "message_events", "api_cost_log", "daily_cost_summary", "user_credits"]
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
        existing = set([r[0] for r in cur.fetchall()])
        missing = [t for t in tables if t not in existing]
        if missing:
            out.append({"name":"DB tables", "status":ERR, "detail":f"Missing tables: {missing}"})
        else:
            out.append({"name":"DB tables", "status":OK, "detail":"Core tables present"})
        cur.close(); conn.close()
    except Exception as e:
        out.append({"name":"DB connect", "status":ERR, "detail":str(e)})
    return out

def check_redis(redis_url: str) -> List[Dict[str, Any]]:
    out=[]
    try:
        import redis
        r = redis.from_url(redis_url)
        pong = r.ping()
        if pong:
            out.append({"name":"Redis", "status":OK, "detail":"PING ok"})
        else:
            out.append({"name":"Redis", "status":ERR, "detail":"ping returned false"})
    except Exception as e:
        out.append({"name":"Redis", "status":ERR, "detail":str(e)})
    return out

def check_storage(env: dict) -> List[Dict[str, Any]]:
    out=[]
    local = env.get("LOCAL_STORAGE_ENABLED","").lower() == "true"
    s3 = bool(env.get("S3_BUCKET_NAME"))
    if local:
        p = env.get("LOCAL_STORAGE_PATH","/var/fishmouth/storage")
        ok = os.path.isdir(p) and os.access(p, os.W_OK)
        out.append({"name":"Local storage", "status":OK if ok else ERR, "detail": f"path={p} write={'yes' if ok else 'no'}"})
    elif s3:
        keys = ["S3_BUCKET_NAME","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY"]
        missing=[k for k in keys if not env.get(k)]
        out.append({"name":"S3 config", "status": ERR if missing else OK, "detail": f"missing={missing}" if missing else "ok"})
    else:
        out.append({"name":"Storage config", "status":ERR, "detail":"Neither local nor S3 configured"})
    return out

def print_report(title, items):
    print(f"\n=== {title} ===")
    for i in items:
        print(f"{i['status']}  {i['name']}: {i['detail']}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default=os.environ.get("API_URL","http://localhost:8000"))
    parser.add_argument("--db", default=os.environ.get("DATABASE_URL",""))
    parser.add_argument("--redis", default=os.environ.get("REDIS_URL",""))
    parser.add_argument("--env", default=".env")
    args = parser.parse_args()

    env = {}
    if os.path.exists(args.env):
        env = load_env_file(args.env)
    else:
        env = dict(os.environ)

    print(f"Fish Mouth Doctor — API={args.api} DB={'set' if args.db else 'unset'} REDIS={'set' if args.redis else 'unset'}")

    api_checks = check_api_health(args.api)
    print_report("API Health", api_checks)

    expected_paths = [
        "/api/v1/properties/lookup",
        "/api/v1/imagery/property",
        "/api/v1/leads/search",
        "/api/v1/communications/email",
        "/api/v1/communications/sms",
        "/api/v1/reports/{id}/render",
        "/api/v1/dashboard/summary",
        "/api/v1/activity",
        "/api/v1/scans",
        "/api/v1/maps/leads",
        "/api/v1/assets/presign"
    ]
    openapi_checks = require_endpoints(args.api, expected_paths)
    print_report("OpenAPI Contracts", openapi_checks)

    if args.db:
        db_checks = check_db(args.db)
        print_report("Database", db_checks)
    else:
        print("\n=== Database ===\n⚠️  DATABASE_URL not provided; skipping DB checks.")

    if args.redis:
        redis_checks = check_redis(args.redis)
        print_report("Redis", redis_checks)
    else:
        print("\n=== Redis ===\n⚠️  REDIS_URL not provided; skipping Redis checks.")

    storage_checks = check_storage(env)
    print_report("Storage", storage_checks)

    # Exit code
    any_err = any(i['status']==ERR for i in api_checks+openapi_checks+storage_checks)
    if args.db:
        any_err = any_err or any(i['status']==ERR for i in db_checks)
    if args.redis:
        any_err = any_err or any(i['status']==ERR for i in redis_checks)
    sys.exit(1 if any_err else 0)

if __name__ == "__main__":
    main()
