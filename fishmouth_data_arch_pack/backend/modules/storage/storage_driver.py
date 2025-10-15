from typing import Optional, Tuple

class StorageDriver:
    def put(self, key: str, content: bytes, content_type: str) -> str:
        """Store bytes at a key. Return canonical URL (not presigned)."""
        raise NotImplementedError
    def get(self, key: str) -> bytes:
        raise NotImplementedError
    def delete(self, key: str) -> None:
        raise NotImplementedError
    def presign(self, key: str, expires_sec: int = 3600) -> str:
        """Return a time-limited public URL."""
        raise NotImplementedError
