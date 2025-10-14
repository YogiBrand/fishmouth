"""
Shared Redis client for all microservices
"""
import redis.asyncio as redis
import json
import logging
from typing import Any, Optional, Dict
import os

logger = logging.getLogger(__name__)

class RedisClient:
    """Async Redis client wrapper"""
    
    def __init__(self):
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self._client = None
    
    async def connect(self):
        """Connect to Redis"""
        if not self._client:
            self._client = redis.from_url(self.redis_url, decode_responses=True)
            await self._client.ping()
            logger.info("✅ Connected to Redis")
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self._client:
            await self._client.close()
            self._client = None
            logger.info("✅ Disconnected from Redis")
    
    async def get(self, key: str) -> Optional[str]:
        """Get value from Redis"""
        if not self._client:
            await self.connect()
        return await self._client.get(key)
    
    async def set(self, key: str, value: str, expire: Optional[int] = None) -> bool:
        """Set value in Redis with optional expiration"""
        if not self._client:
            await self.connect()
        return await self._client.set(key, value, ex=expire)
    
    async def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        """Get JSON value from Redis"""
        data = await self.get(key)
        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON from Redis key: {key}")
        return None
    
    async def set_json(self, key: str, value: Dict[str, Any], expire: Optional[int] = None) -> bool:
        """Set JSON value in Redis"""
        return await self.set(key, json.dumps(value), expire)
    
    async def delete(self, key: str) -> int:
        """Delete key from Redis"""
        if not self._client:
            await self.connect()
        return await self._client.delete(key)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis"""
        if not self._client:
            await self.connect()
        return bool(await self._client.exists(key))
    
    async def lpush(self, key: str, *values: str) -> int:
        """Push values to left of list"""
        if not self._client:
            await self.connect()
        return await self._client.lpush(key, *values)
    
    async def rpop(self, key: str) -> Optional[str]:
        """Pop value from right of list"""
        if not self._client:
            await self.connect()
        return await self._client.rpop(key)
    
    async def llen(self, key: str) -> int:
        """Get length of list"""
        if not self._client:
            await self.connect()
        return await self._client.llen(key)

# Global Redis client instance
redis_client = RedisClient()