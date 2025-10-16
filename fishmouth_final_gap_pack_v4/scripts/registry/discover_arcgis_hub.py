#!/usr/bin/env python3
# Discover open data portals via ArcGIS Hub search API (prints JSON lines)
import sys, json, http.client, urllib.parse
q = sys.argv[1] if len(sys.argv)>1 else "permits"
conn = http.client.HTTPSConnection("hub.arcgis.com")
conn.request("GET", "/api/search/datasets?"+urllib.parse.urlencode({"q":q, "page[size]":"50"}))
res = conn.getresponse()
print(res.status, res.reason, file=sys.stderr)
print(res.read().decode())
