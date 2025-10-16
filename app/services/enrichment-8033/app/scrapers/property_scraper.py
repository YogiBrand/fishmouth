import re, json, time, random
from typing import Optional, Dict
import requests
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

def get_property_details(address: str) -> Dict:
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    q = address.replace("#","").replace(","," ").replace("  "," ").strip()
    url = f"https://www.zillow.com/homes/{requests.utils.quote(q)}/"
    r = s.get(url, timeout=20)
    if r.status_code == 200:
        data = _parse_zillow_html(r.text)
        if data: 
            data.setdefault("address", address)
            return data
    url2 = f"https://www.zillow.com/homes/for_sale/{requests.utils.quote(q)}/"
    r2 = s.get(url2, timeout=20)
    if r2.status_code == 200:
        data = _parse_zillow_html(r2.text)
        if data:
            data.setdefault("address", address)
            return data
    return {"address": address, "note":"not_found"}

def _parse_zillow_html(html: str) -> Optional[Dict]:
    soup = BeautifulSoup(html, "html.parser")
    for scr in soup.find_all("script"):
        if scr.string and "__NEXT_DATA__" in scr.string:
            try:
                start = scr.string.index("{")
                j = json.loads(scr.string[start:])
                return _extract_from_nextdata(j)
            except Exception:
                continue
    card = soup.select_one("[data-test='property-card']")
    if card:
        price = card.get_text(" ", strip=True)
        return {"value_estimate": _grab_price(price)}
    return None

def _extract_from_nextdata(j: Dict) -> Dict:
    text = json.dumps(j)
    out = {}
    m = re.search(r'"price":\s*([0-9]{5,})', text)
    if m: out["value_estimate"] = int(m.group(1))
    m = re.search(r'"bedrooms":\s*([0-9\.]+)', text)
    if m: out["beds"] = float(m.group(1))
    m = re.search(r'"bathrooms":\s*([0-9\.]+)', text)
    if m: out["baths"] = float(m.group(1))
    m = re.search(r'"livingArea":\s*([0-9]{2,5})', text)
    if m: out["sqft"] = int(m.group(1))
    m = re.search(r'"yearBuilt":\s*([0-9]{4})', text)
    if m: out["year_built"] = int(m.group(1))
    return out

def _grab_price(txt: str) -> Optional[int]:
    import re
    m = re.search(r'\$?([0-9,]{5,})', txt)
    return int(m.group(1).replace(",","")) if m else None
