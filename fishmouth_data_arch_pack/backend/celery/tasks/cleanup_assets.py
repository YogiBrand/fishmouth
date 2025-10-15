from celery import Celery
from datetime import datetime, timezone
app = Celery("cleanup")

@app.task
def expire_assets():
    # delete or mark expired assets (according to expires_at or bucket lifecycle)
    return True
