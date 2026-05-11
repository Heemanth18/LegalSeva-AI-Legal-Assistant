from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import json
import time

BASE_URL = "https://www.indiacode.nic.in/show-data"
ACT_ID = "AC_CEN_5_23_00001_186045_1517807328291"

options = Options()
options.add_argument("--headless")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=options
)

ipc_sections = []

for section in range(1, 512):
    print(f"🔍 Fetching Section {section}")
    url = f"{BASE_URL}?actid={ACT_ID}&sectionId={section}"
    driver.get(url)

    time.sleep(3)  # allow JS load

    page_text = driver.find_element("tag name", "body").text.strip()

    # 🔍 VALIDATE CONTENT
    if f"Section {section}" not in page_text:
        print(f"⚠️ Section {section} not found")
        continue

    # Extract section text starting from "Section X"
    start_index = page_text.find(f"Section {section}")
    section_text = page_text[start_index:]

    # Trim excessive footer text
    section_text = section_text.split("Ministry of Law")[0].strip()

    ipc_sections.append({
        "act": "Indian Penal Code",
        "section": str(section),
        "title": section_text.split(".")[0],
        "full_text": section_text,
        "source_url": url
    })

driver.quit()

with open("ipc_full.json", "w", encoding="utf-8") as f:
    json.dump(ipc_sections, f, indent=2, ensure_ascii=False)

print(f"✅ Saved {len(ipc_sections)} IPC sections")