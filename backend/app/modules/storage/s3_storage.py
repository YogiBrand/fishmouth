import boto3, os
from botocore.client import Config
from .storage_driver import StorageDriver

class S3StorageDriver(StorageDriver):
    def __init__(self, bucket: str, region: str = "us-east-1", endpoint_url: str = None):
        self.bucket = bucket
        self.s3 = boto3.client("s3", region_name=region, endpoint_url=endpoint_url, config=Config(s3={'addressing_style':'virtual'}))

    def put(self, key: str, content: bytes, content_type: str) -> str:
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=content, ContentType=content_type)
        return f"s3://{self.bucket}/{key}"

    def get(self, key: str) -> bytes:
        obj = self.s3.get_object(Bucket=self.bucket, Key=key)
        return obj['Body'].read()

    def delete(self, key: str) -> None:
        self.s3.delete_object(Bucket=self.bucket, Key=key)

    def presign(self, key: str, expires_sec: int = 3600) -> str:
        return self.s3.generate_presigned_url('getObject', Params={'Bucket': self.bucket, 'Key': key}, ExpiresIn=expires_sec)
