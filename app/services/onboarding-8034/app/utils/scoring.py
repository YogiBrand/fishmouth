import random

def score_point(lat, lon):
    random.seed(f"{lat:.5f},{lon:.5f}")
    base = 50 + 50*random.random()
    boost = 10*random.random()
    score = min(100.0, base + boost)
    expected_revenue = round(8000 + score*120, 2)
    return score, expected_revenue
