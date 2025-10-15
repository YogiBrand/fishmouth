from celery import Celery
app = Celery("imagery")

@app.task
def fetch_and_store_tile(lat: float, lng: float, zoom: int, provider: str):
    # call provider API via external_call wrapper, then store thumb in assets
    return True
