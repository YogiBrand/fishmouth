"""
Shared database utilities for all microservices
"""
import asyncpg
import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class DatabaseClient:
    """Async PostgreSQL client wrapper"""
    
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL', 'postgresql://fishmouth:fishmouth123@localhost:5432/fishmouth')
        self._pool = None
    
    async def connect(self):
        """Create connection pool"""
        if not self._pool:
            self._pool = await asyncpg.create_pool(self.database_url)
            logger.info("✅ Connected to PostgreSQL")
    
    async def disconnect(self):
        """Close connection pool"""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("✅ Disconnected from PostgreSQL")
    
    async def execute(self, query: str, *args) -> str:
        """Execute query that doesn't return data"""
        if not self._pool:
            await self.connect()
        async with self._pool.acquire() as conn:
            return await conn.execute(query, *args)
    
    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Fetch single row as dict"""
        if not self._pool:
            await self.connect()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None
    
    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        """Fetch all rows as list of dicts"""
        if not self._pool:
            await self.connect()
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]
    
    async def insert_scraping_job(
        self,
        job_type: str,
        city: str,
        state: str,
        metadata: Optional[Dict] = None
    ) -> str:
        """Insert new scraping job"""
        query = """
        INSERT INTO scraping_jobs (job_type, city, state, status, metadata)
        VALUES ($1, $2, $3, 'pending', $4)
        RETURNING id
        """
        result = await self.fetch_one(query, job_type, city, state, json.dumps(metadata or {}))
        return result['id']
    
    async def update_scraping_job(
        self,
        job_id: str,
        status: str,
        records_processed: int = 0,
        records_succeeded: int = 0,
        records_failed: int = 0,
        error_message: Optional[str] = None
    ) -> None:
        """Update scraping job status"""
        query = """
        UPDATE scraping_jobs 
        SET status = $2, records_processed = $3, records_succeeded = $4, 
            records_failed = $5, error_message = $6, completed_at = NOW()
        WHERE id = $1
        """
        await self.execute(query, job_id, status, records_processed, records_succeeded, records_failed, error_message)
    
    async def log_scraping_error(
        self,
        job_id: str,
        url: str,
        error_type: str,
        error_message: str,
        retry_count: int = 0
    ) -> None:
        """Log scraping error"""
        query = """
        INSERT INTO scraping_errors (job_id, url, error_type, error_message, retry_count)
        VALUES ($1, $2, $3, $4, $5)
        """
        await self.execute(query, job_id, url, error_type, error_message, retry_count)
    
    async def cache_scraping_result(
        self,
        url: str,
        content: str,
        content_type: str = 'text/html',
        http_status: int = 200,
        expire_hours: int = 24
    ) -> None:
        """Cache scraping result"""
        query = """
        INSERT INTO scraping_cache (url, content, content_type, http_status, expires_at)
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '%s hours')
        ON CONFLICT (url) DO UPDATE SET
        content = EXCLUDED.content,
        content_type = EXCLUDED.content_type,
        http_status = EXCLUDED.http_status,
        scraped_at = NOW(),
        expires_at = EXCLUDED.expires_at
        """ % expire_hours
        await self.execute(query, url, content, content_type, http_status)
    
    async def get_cached_result(self, url: str) -> Optional[Dict[str, Any]]:
        """Get cached scraping result"""
        query = """
        SELECT content, content_type, http_status, scraped_at
        FROM scraping_cache
        WHERE url = $1 AND expires_at > NOW()
        """
        return await self.fetch_one(query, url)

# Global database client instance
db_client = DatabaseClient()