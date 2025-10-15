import os, random, string
from typing import Dict, Optional

SHORTLINKS: Dict[str, str] = {}

def make_code(n: int = 7) -> str:
    return ''.join(random.choices(string.ascii_letters + string.digits, k=n))

def create_shortlink(target_url: str) -> str:
    code = make_code()
    SHORTLINKS[code] = target_url
    return code

def resolve_shortlink(code: str) -> Optional[str]:
    return SHORTLINKS.get(code)
