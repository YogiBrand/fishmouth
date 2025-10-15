from celery import Celery
app = Celery("scanner")

@app.task
def run_scan(scan_id: str):
    # 1) Load scan job, polygon, filters, provider policy
    # 2) Compute tile cover
    # 3) For each tile: fetch imagery if needed, run quick CV, identify candidate roofs
    # 4) Enrichment + property creation + lead scoring
    # 5) Write scan_results and update stats
    return {"scan_id": scan_id, "status": "completed"}
