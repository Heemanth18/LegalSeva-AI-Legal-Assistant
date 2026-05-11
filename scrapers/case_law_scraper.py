import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import os

# Base search URL
BASE_URL = "https://indiankanoon.org/search/?formInput="

# Dataset save path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "case_law_dataset.csv")


def scrape_cases(query, domain, max_cases=20):
    """
    Scrape case titles and summaries from Indian Kanoon search results
    """

    url = BASE_URL + query.replace(" ", "+")

    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(url, headers=headers)

    soup = BeautifulSoup(response.text, "html.parser")

    results = []

    case_blocks = soup.select(".result")

    for case in case_blocks[:max_cases]:

        title_tag = case.select_one("a")

        snippet_tag = case.select_one(".snippet")

        if not title_tag:
            continue

        title = title_tag.text.strip()

        link = "https://indiankanoon.org" + title_tag["href"]

        summary = ""

        if snippet_tag:
            summary = snippet_tag.text.strip()

        results.append({
            "title": title,
            "summary": summary,
            "sections": "",
            "domain": domain,
            "source_link": link
        })

    return results


def save_cases():
    """
    Run scraper for multiple legal queries
    """

    queries = [
        ("ipc theft", "criminal"),
        ("murder ipc case", "criminal"),
        ("cheating ipc case", "criminal"),
        ("consumer dispute case india", "consumer"),
        ("cyber fraud case india", "cybercrime"),
        ("bank fraud cyber crime", "cybercrime"),
        ("land dispute case india", "civil")
    ]

    all_cases = []

    for query, domain in queries:

        print("Scraping:", query)

        cases = scrape_cases(query, domain)

        all_cases.extend(cases)

        time.sleep(3)  # prevent blocking

    df = pd.DataFrame(all_cases)

    # Create datasets folder if missing
    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)

    df.to_csv(DATASET_PATH, index=False)

    print("Saved", len(df), "cases to dataset")


if __name__ == "__main__":
    save_cases()