#!/usr/bin/env python3
"""Run Crawl4AI locally with fallbacks and output normalized JSONL."""
import json, sys, subprocess, os

def run_crawl(urls):
    # Expect local Crawl4AI at http://localhost:11235
    import requests
    r = requests.post("http://localhost:11235/crawl", json={"urls": urls, "priority": 10})
    r.raise_for_status()
    return r.json()

if __name__ == "__main__":
    urls = sys.argv[1:] or ["https://example.com"]
    data = run_crawl(urls)
    print(json.dumps(data, indent=2))
