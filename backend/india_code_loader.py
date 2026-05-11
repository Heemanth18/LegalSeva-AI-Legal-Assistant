"""
india_code_loader.py
Utility to load / scrape statute text from the India Code website
(https://www.indiacode.nic.in) and local CSV/JSON datasets.

Used by law_database.py to seed the vector stores with fresh data.
"""
import json
import time
import csv
import re
import logging
from pathlib import Path
from typing import Iterator

logger = logging.getLogger(__name__)

try:
    import requests
    _HAS_REQUESTS = True
except ImportError:
    _HAS_REQUESTS = False

_BASE = Path(__file__).resolve().parent.parent
_DATASETS = _BASE / "datasets"
_INDIA_CODE_BASE = "https://www.indiacode.nic.in"

# Known act codes on IndiaCode for direct fetching
ACT_CODES = {
    "ipc":      "1860-45",
    "crpc":     "1973-2",
    "cpc":      "1908-5",
    "consumer": "2019-35",
    "it_act":   "2000-21",
    "pocso":    "2012-32",
    "dv_act":   "2005-43",
}

# ── Local dataset loaders ──────────────────────────────────────────────────────

def load_ipc_from_json(path: Path | None = None) -> list[dict]:
    """Load IPC sections from the local normalised JSON file."""
    json_path = path or _DATASETS / "indian_laws" / "ipc_normalized.json"
    if not json_path.exists():
        logger.warning(f"IPC JSON not found at {json_path}")
        return []
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    sections = data if isinstance(data, list) else data.get("sections", [])
    logger.info(f"Loaded {len(sections)} IPC sections from {json_path}")
    return sections

def load_csv_dataset(csv_path: Path) -> list[dict]:
    """Generic CSV loader — returns list of row dicts."""
    if not csv_path.exists():
        logger.warning(f"CSV not found: {csv_path}")
        return []
    rows = []
    with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(dict(row))
    logger.info(f"Loaded {len(rows)} rows from {csv_path}")
    return rows

def load_all_case_laws() -> list[dict]:
    """Aggregate all case law CSVs into one list."""
    files = [
        "case_law_dataset.csv",
        "case_laws_dataset.csv",
        "large_case_law_dataset.csv",
    ]
    all_cases: list[dict] = []
    for fname in files:
        path = _DATASETS / fname
        all_cases.extend(load_csv_dataset(path))
    logger.info(f"Total case law records: {len(all_cases)}")
    return all_cases

def load_fir_dataset() -> list[dict]:
    return load_csv_dataset(_DATASETS / "FIR_DATASET.csv")

def load_consumer_dataset() -> list[dict]:
    return load_csv_dataset(_DATASETS / "consumer_law_dataset.csv")

def load_cybercrime_dataset() -> list[dict]:
    return load_csv_dataset(_DATASETS / "cybercrime_dataset.csv")

def load_ipc_metadata() -> list[dict]:
    return load_csv_dataset(_DATASETS / "ipc_metadata.csv")

# ── Remote fetcher (IndiaCode) ─────────────────────────────────────────────────

def fetch_act_sections(act_code: str, delay: float = 1.0) -> list[dict]:
    """
    Fetch sections of an act from IndiaCode.
    Returns list of {section, title, text} dicts.
    Requires: pip install requests beautifulsoup4
    """
    if not _HAS_REQUESTS:
        logger.error("requests not installed. Run: pip install requests beautifulsoup4")
        return []

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error("beautifulsoup4 not installed.")
        return []

    url = f"{_INDIA_CODE_BASE}/handle/123456789/{act_code}"
    sections: list[dict] = []

    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # IndiaCode section containers
        for tag in soup.select(".section-wrapper, .act-section, [class*='section']"):
            title_el = tag.select_one("h4, h3, .section-heading")
            body_el  = tag.select_one("p, .section-body")
            if not title_el:
                continue

            title_text = title_el.get_text(strip=True)
            sec_match  = re.match(r"^(\d+[A-Z]?)\.", title_text)
            sections.append({
                "section": sec_match.group(1) if sec_match else "",
                "title":   title_text,
                "text":    body_el.get_text(strip=True) if body_el else "",
            })
        time.sleep(delay)

    except Exception as e:
        logger.error(f"Failed to fetch act {act_code}: {e}")

    return sections

def iter_ipc_sections() -> Iterator[dict]:
    """Generator over all locally available IPC sections."""
    yield from load_ipc_from_json()

# ── CLI helper ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    act = sys.argv[1] if len(sys.argv) > 1 else "ipc"
    code = ACT_CODES.get(act, act)
    secs = fetch_act_sections(code)
    print(json.dumps(secs[:5], indent=2))