#!/usr/bin/env python3
"""Build a registry of open data portals (Socrata + ArcGIS Hub + Data.gov).
Note: Run this on your machine with Internet access. Results saved to data/portals.json.
"""
import requests, json, os, time
from urllib.parse import urlencode

OUT = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUT, exist_ok=True)

def socrata_catalog(q="permits"):
    # Discovery API is documented at dev.socrata.com (CKAN-like metadata)
    url = "https://api.us.socrata.com/api/catalog/v1"
    params = {"q": q, "limit": 50}
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    items = []
    for res in r.json().get("results", []):
        domain = res.get("metadata", {}).get("domain")
        ref = res.get("resource", {})
        items.append({"source":"socrata","domain":domain,"id":ref.get("id"),"name":ref.get("name"),"link":ref.get("link")})
    return items

def arcgis_hub_search(q="permits"):
    # Hub v3 search (public). See esri hub docs for filters.
    url = "https://hub.arcgis.com/api/v3/search"
    params = {"q": q, "page[size]": 50}
    r = requests.get(f"{url}?{urlencode(params)}", timeout=30)
    r.raise_for_status()
    data = r.json()
    items = []
    for hit in data.get("data", []):
        attr = hit.get("attributes", {})
        items.append({"source":"arcgis_hub","title":attr.get("title"),"type":attr.get("type"),"url":attr.get("url")})
    return items

def main():
    reg = {"socrata": socrata_catalog(), "arcgis_hub": arcgis_hub_search()}
    with open(os.path.join(OUT, "portals.json"), "w") as f:
        json.dump(reg, f, indent=2)
    print("Saved", os.path.join(OUT, "portals.json"))

if __name__ == "__main__":
    main()
