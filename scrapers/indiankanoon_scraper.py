import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import os

BASE_SEARCH_URL = "https://indiankanoon.org/search/?formInput={query}&pagenum={page}"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "case_law_dataset.csv")


def extract_verdict(case_url):
    """
    Visit case page and extract first paragraph of judgment
    """

    try:

        headers = {"User-Agent": "Mozilla/5.0"}

        response = requests.get(case_url, headers=headers, timeout=10)

        soup = BeautifulSoup(response.text, "html.parser")

        paragraphs = soup.select(".judgments p")

        if paragraphs:
            return paragraphs[0].text.strip()

        return ""

    except:
        return ""


def scrape_search_page(query, domain, page):

    url = BASE_SEARCH_URL.format(
        query=query.replace(" ", "+"),
        page=page
    )

    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, headers=headers)

    soup = BeautifulSoup(response.text, "html.parser")

    cases = []

    results = soup.select(".result")

    for case in results:

        title_tag = case.select_one("a")

        snippet_tag = case.select_one(".snippet")

        if not title_tag:
            continue

        title = title_tag.text.strip()

        link = "https://indiankanoon.org" + title_tag["href"]

        summary = ""

        if snippet_tag:
            summary = snippet_tag.text.strip()

        print("Extracting verdict for:", title)

        verdict = extract_verdict(link)

        cases.append({
            "title": title,
            "summary": summary,
            "sections": "",
            "domain": domain,
            "verdict": verdict,
            "source_link": link
        })

    return cases


def scrape_cases(query, domain, pages=5):

    all_cases = []

    for page in range(pages):

        print(f"Scraping {query} page {page}")

        cases = scrape_search_page(query, domain, page)

        all_cases.extend(cases)

        time.sleep(2)

    return all_cases


def generate_dataset():

    queries = [
        ("ipc theft", "criminal"),
        ("murder ipc", "criminal"),
        ("cheating ipc", "criminal"),
        ("consumer dispute india", "consumer"),
        ("cyber fraud india", "cybercrime"),
        ("property dispute india", "civil")
    ]

    all_cases = []

    for query, domain in queries:

        cases = scrape_cases(query, domain, pages=5)

        all_cases.extend(cases)

    df = pd.DataFrame(all_cases)

    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)

    df.to_csv(DATASET_PATH, index=False)

    print("Dataset created with", len(df), "cases")


if __name__ == "__main__":
    generate_dataset()