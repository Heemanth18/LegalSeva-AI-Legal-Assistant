import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import os
import random

BASE_URL = "https://indiankanoon.org/search/"

headers = {
    "User-Agent": "Mozilla/5.0"
}

queries = [
    ("ipc 302 murder case", "criminal"),
    ("ipc 379 theft case", "criminal"),
    ("ipc 420 cheating case", "criminal"),
    ("cyber fraud india case", "cybercrime"),
    ("online banking fraud india", "cybercrime"),
    ("consumer dispute india case law", "consumer"),
    ("mrp violation consumer case", "consumer"),
    ("property dispute india case law", "civil"),
    ("land ownership dispute india", "civil"),
    ("contract breach case india", "civil")
]

cases = []


def extract_verdict(link):

    try:

        page = requests.get(link, headers=headers, timeout=10)

        soup = BeautifulSoup(page.text, "html.parser")

        text = soup.get_text().lower()

        keywords = [
            "convicted",
            "acquitted",
            "dismissed",
            "allowed",
            "sentenced",
            "held that"
        ]

        for k in keywords:

            idx = text.find(k)

            if idx != -1:
                return text[idx:idx+400]

        return ""

    except:
        return ""


for query, domain in queries:

    print("Searching:", query)

    for page in range(0, 50):   # 50 pages per query

        params = {
            "formInput": query,
            "pagenum": page
        }

        try:

            response = requests.get(BASE_URL, params=params, headers=headers)

        except:
            continue

        soup = BeautifulSoup(response.text, "html.parser")

        results = soup.select(".result")

        if not results:
            break

        for result in results:

            title_tag = result.select_one("a")

            if not title_tag:
                continue

            title = title_tag.text.strip()

            link = "https://indiankanoon.org" + title_tag["href"]

            snippet = result.select_one(".snippet")

            summary = ""

            if snippet:
                summary = snippet.text.strip()

            verdict = extract_verdict(link)

            cases.append({
                "title": title,
                "summary": summary,
                "sections": "",
                "domain": domain,
                "verdict": verdict,
                "source_link": link
            })

            print("Collected:", title[:60])

            time.sleep(random.uniform(1.5, 3))

        print("Page", page, "done")

print("Total cases:", len(cases))

df = pd.DataFrame(cases)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "datasets")

os.makedirs(DATASET_DIR, exist_ok=True)

output = os.path.join(DATASET_DIR, "large_case_law_dataset.csv")

df.to_csv(output, index=False)

print("Dataset saved:", output)