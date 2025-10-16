#!/usr/bin/env python3
# Discover Socrata portals via their discovery API (prints JSON)
import sys, json, http.client, urllib.parse
q = sys.argv[1] if len(sys.argv)>1 else "permits"
conn = http.client.HTTPSConnection("api.us.socrata.com")
conn.request("GET", "/api/catalog/v1?"+urllib.parse.urlencode({"search_context":"us","q":q,"limit":"50"}))
res = conn.getresponse()
print(res.status, res.reason, file=sys.stderr)
print(res.read().decode())
