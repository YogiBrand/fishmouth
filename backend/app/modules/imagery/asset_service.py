import io, time, hashlib
from PIL import Image  # pillow
from typing import Optional
from ..storage.storage_driver import StorageDriver

class AssetService:
    def __init__(self, driver: StorageDriver):
        self.driver = driver

    def _checksum(self, data: bytes) -> str:
        import hashlib
        return hashlib.sha256(data).hexdigest()

    def save_thumbnail(self, image_bytes: bytes, key_prefix: str, max_side: int = 800) -> dict:
        img = Image.open(io.BytesIO(image_bytes))
        img.thumbnail((max_side, max_side))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        data = buf.getvalue()
        checksum = self._checksum(data)
        key = f"{key_prefix}/thumb_{checksum[:12]}.jpg"
        url = self.driver.put(key, data, "image/jpeg")
        return {"storage_key": key, "url": url, "checksum": checksum, "byte_size": len(data)}

    def save_overlay(self, overlay_png: bytes, key_prefix: str, ttl_days: int = 30) -> dict:
        checksum = self._checksum(overlay_png)
        key = f"{key_prefix}/overlay_{checksum[:12]}.png"
        url = self.driver.put(key, overlay_png, "image/png")
        # expiry is handled by bucket lifecycle; presign when serving
        return {"storage_key": key, "url": url, "checksum": checksum, "byte_size": len(overlay_png)}

    def presign(self, storage_key: str, expires_sec: int = 3600) -> str:
        return self.driver.presign(storage_key, expires_sec)
