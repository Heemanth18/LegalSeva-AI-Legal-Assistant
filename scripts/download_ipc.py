import requests
from bs4 import BeautifulSoup
import json
import time

BASE_URL = "https://www.indiacode.nic.in/show-data"
ACT_ID = "AC_CEN_5_23_00001_186045_1517807328291"

ipc_sections = []

for section in range(1, 512):  # IPC sections range
    params = {
        "actid": ACT_ID,
        "sectionId": section
    }

    response = requests.get(BASE_URL, params=params)
    if response.status_code != 200:
        continue

    soup = BeautifulSoup(response.text, "html.parser")
    text_div = soup.find("div", class_="act-section")

    if not text_div:
        continue

    section_text = text_div.get_text(separator=" ", strip=True)

    ipc_sections.append({
        "act": "Indian Penal Code",
        "section": str(section),
        "title": section_text.split(".")[0],
        "full_text": section_text
    })

    time.sleep(0.5)  # be respectful

with open("ipc_full.json", "w", encoding="utf-8") as f:
    json.dump(ipc_sections, f, indent=2, ensure_ascii=False)

print("IPC dataset saved.")