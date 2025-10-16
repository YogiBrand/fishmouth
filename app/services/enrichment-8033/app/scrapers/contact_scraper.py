import re, time
from typing import Dict, Optional
import requests
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

TPS_BASE = "https://www.truepeoplesearch.com"

def search_contact_by_address(street: str, city: str, state: str) -> Dict:
    s = requests.Session(); s.headers.update({"User-Agent": UA})
    url = f"{TPS_BASE}/results?streetaddress={requests.utils.quote(street)}&citystatezip={requests.utils.quote(city+', '+state)}"
    r = s.get(url, timeout=25)
    if r.status_code != 200:
        return {"note":"blocked_or_not_found", "status": r.status_code}
    soup = BeautifulSoup(r.text, "html.parser")
    card = soup.select_one(".result-card")
    if not card:
        return {"note":"no_results"}
    name = card.select_one(".h4").get_text(strip=True) if card.select_one(".h4") else None
    age = None
    age_el = card.find(text=re.compile("Age"))
    if age_el:
        m = re.search(r'Age\s*(\d+)', age_el)
        if m: age = int(m.group(1))
    phones = []
    for ph in soup.select(".detail-wrapper .link-to-more"):
        t = ph.get_text(strip=True)
        if re.search(r"\d{3}.?\d{3}.?\d{4}", t):
            phones.append(t)
    return {"query": f"{street}, {city}, {state}", "name": name, "age": age, "phones": list(dict.fromkeys(phones))}

def search_contact_by_name(name: str, city: Optional[str]=None, state: Optional[str]=None) -> Dict:
    s = requests.Session(); s.headers.update({"User-Agent": UA})
    url = f"{TPS_BASE}/results?name={requests.utils.quote(name)}"
    if city or state:
        citystate = ", ".join([c for c in [city, state] if c])
        url += f"&citystatezip={requests.utils.quote(citystate)}"
    r = s.get(url, timeout=25)
    if r.status_code != 200:
        return {"note":"blocked_or_not_found", "status": r.status_code}
    soup = BeautifulSoup(r.text, "html.parser")
    card = soup.select_one(".result-card")
    if not card:
        return {"note":"no_results"}
    nm = card.select_one(".h4").get_text(strip=True) if card.select_one(".h4") else None
    return {"name": nm or name, "note":"partial"}
