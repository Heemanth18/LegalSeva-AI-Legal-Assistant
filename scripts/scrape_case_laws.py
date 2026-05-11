import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import os

BASE_URL = "https://indiankanoon.org/search/"

headers = {
    "User-Agent": "Mozilla/5.0"
}

queries = [
    ("bike theft ipc 378", "criminal"),
    ("murder ipc 302", "criminal"),
    ("cheating ipc 420", "criminal"),
    ("consumer dispute case india", "consumer"),
    ("cyber fraud case india", "cybercrime"),
    ("property dispute india", "civil")
]

cases = []


def extract_verdict(link):

    try:
        page = requests.get(link, headers=headers, timeout=10)
        soup = BeautifulSoup(page.text, "html.parser")

        judgment_text = soup.get_text().lower()

        keywords = [
            "held that",
            "convicted",
            "acquitted",
            "dismissed",
            "allowed",
            "sentenced"
        ]

        for k in keywords:
            idx = judgment_text.find(k)

            if idx != -1:
                verdict = judgment_text[idx:idx+300]
                return verdict.strip()

        return ""

    except:
        return ""


for query, domain in queries:

    print("Scraping:", query)

    params = {"formInput": query}

    response = requests.get(BASE_URL, params=params, headers=headers)

    soup = BeautifulSoup(response.text, "html.parser")

    results = soup.select(".result")

    for result in results[:10]:

        title_tag = result.select_one("a")

        if not title_tag:
            continue

        title = title_tag.text.strip()

        link = "https://indiankanoon.org" + title_tag["href"]

        summary_tag = result.select_one(".snippet")

        summary = ""

        if summary_tag:
            summary = summary_tag.text.strip()

        sections = []

        for word in summary.split():
            if word.isdigit():
                sections.append(word)

        verdict = extract_verdict(link)

        cases.append({
            "title": title,
            "summary": summary,
            "sections": ",".join(sections),
            "domain": domain,
            "verdict": verdict,
            "source_link": link
        })

        time.sleep(2)


print("Total cases collected:", len(cases))

df = pd.DataFrame(cases)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "datasets")

os.makedirs(DATASET_DIR, exist_ok=True)

output_path = os.path.join(DATASET_DIR, "case_laws_dataset.csv")

df.to_csv(output_path, index=False)

print("Dataset saved to:", output_path)