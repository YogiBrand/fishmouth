import os, time
from .storage_driver import StorageDriver

class LocalStorageDriver(StorageDriver):
    def __init__(self, base_path: str = "/var/fishmouth/storage", public_base: str = "/static/uploads"):
        self.base_path = base_path
        self.public_base = public_base
        os.makedirs(self.base_path, exist_ok=True)

    def _fullpath(self, key: str) -> str:
        path = os.path.join(self.base_path, key.lstrip('/'))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        return path

    def put(self, key: str, content: bytes, content_type: str) -> str:
        with open(self._fullpath(key), "wb") as f:
            f.write(content)
        return f"{self.public_base}/{key}"

    def get(self, key: str) -> bytes:
        with open(self._fullpath(key), "rb") as f:
            return f.read()

    def delete(self, key: str) -> None:
        try:
            os.remove(self._fullpath(key))
        except FileNotFoundError:
            pass

    def presign(self, key: str, expires_sec: int = 3600) -> str:
        # For local dev, just return the static path (no real signing)
        ts = int(time.time()) + expires_sec
        return f"{self.public_base}/{key}?e={ts}"
