import httpx
from ddgs import DDGS
from bs4 import BeautifulSoup
from readability import Document
import re

# arithmetic
def add(a: int, b: int) -> int:
    """Add two integers and return the result."""
    return a + b


def subtract(a: int, b: int) -> int:
    """Subtract the second integer from the first integer."""
    return a - b


def multiply(a: int, b: int) -> int:
    """Multiply two integers and return the product."""
    return a * b


def divide(a: int, b: int) -> float:
    """Divide the first integer by the second integer. The second integer must not be zero."""
    return a / b


def modulo(a: int, b: int) -> int:
    """Return the remainder when the first integer is divided by the second integer."""
    return a % b


def power(base: int, exponent: int) -> int:
    """Raise the first integer to the power of the second integer."""
    return base ** exponent


def absolute(a: int) -> int:
    """Return the absolute value of an integer."""
    return abs(a)

# web search
def search_web(query: str, max_results: int = 5):
    """Search the web for the given query and return a list of urls."""
    results = []
    with DDGS() as ddg:
        for result in ddg.text(query, max_results=max_results):
            results.append({
                "title": result.get("title"),
                "url": result.get("href")
            })
    return results

# web scrap
def web_scrape_text(url: str, max_chars: int = 4000) -> str:
    """
    Fetch a webpage and extract its main readable text (no JS, no interaction).
    Returns cleaned plain text. Returns None on errors.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    }

    try:
        with httpx.Client(follow_redirects=True, timeout=10) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            html = resp.text
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        print(f"[web_scrape_text] Failed to fetch {url}: {e}")
        return None

    try:
        doc = Document(html)
        main_html = doc.summary(html_partial=True)
        soup = BeautifulSoup(main_html, "html.parser")

        for tag in soup(["script", "style", "noscript", "svg"]):
            tag.decompose()

        for img in soup.find_all("img"):
            if img.get("alt"):
                img.replace_with(f"[Image: {img['alt']}]")
            else:
                img.decompose()

        lines = [elem.get_text(strip=True) for elem in soup.find_all(["h1","h2","h3","p","li"]) if elem.get_text(strip=True)]
        text = "\n".join(lines)
        text = re.sub(r"\n{3,}", "\n\n", text)

        title = doc.title()
        if not title:
            raw_soup = BeautifulSoup(html, "html.parser")
            title = raw_soup.title.get_text(strip=True) if raw_soup.title else "No title"

        output = f"Title: {title}\n\n{text}".strip()
        if len(text.strip()) < 200:
            return None

        return output[:max_chars]

    except Exception as e:
        print(f"[web_scrape_text] Error parsing {url}: {e}")
        return None

import json
from langchain_core.messages import SystemMessage
from langchain_groq import ChatGroq

async def research(task: str, question: str, max_sources: int = 3):
    def _invoke_json(prompt: str, max_attempts: int = 3):
        last_error = None
        last_output = None
        for _ in range(max_attempts):
            response = llm.invoke([SystemMessage(content=prompt)])
            raw = response.content
            try:
                return json.loads(raw)
            except json.JSONDecodeError as e:
                last_error = str(e)
                last_output = raw
                prompt = f"""
PREVIOUS OUTPUT INVALID JSON:
{last_output}

ERROR:
{last_error}

You MUST return valid JSON only.
{prompt}
"""
        return None
    
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.0,
        max_tokens=300
    )

    query_prompt = f"""
You are generating a web search query.

Task:
{task}

Question:
{question}

Generate a concise, factual search query suitable for a search engine.

Return ONLY valid JSON in the format:
{{
  "query": "<search query>"
}}
"""
    query_result = _invoke_json(query_prompt)
    if not query_result or "query" not in query_result:
        return {"answer": "Failed to generate search query.", "sources": [], "confidence": 0.0}

    search_query = query_result["query"]

    results = search_web(search_query, max_results=max_sources)
    sources_used = []

    for result in results:
        url = result.get("url")
        if not url:
            continue

        text = web_scrape_text(url)
        if not text:
            print(f"[Research] Skipping {url} due to fetch/parse failure")
            continue

        suff_prompt = f"""
You are evaluating whether an article contains enough factual information to directly answer a question.

Task:
{task}

Question:
{question}

Article Content:
{text[:4000]}

Return ONLY valid JSON in the format:
{{
  "sufficient": true/false,
  "reason": "<short reason>",
  "confidence": 0.0-1.0
}}
"""
        sufficiency = _invoke_json(suff_prompt)
        if not sufficiency:
            continue

        if sufficiency.get("sufficient"):
            # 5️⃣ Extract answer
            extract_prompt = f"""
You are extracting a precise factual answer.

Task:
{task}

Question:
{question}

Article Content:
{text[:4000]}

Return ONLY valid JSON in the format:
{{
  "answer": "<clear factual answer>"
}}
"""
            extracted = _invoke_json(extract_prompt)
            if not extracted or "answer" not in extracted:
                continue

            sources_used.append(url)
            return {
                "answer": extracted["answer"],
                "sources": sources_used,
                "confidence": sufficiency.get("confidence", 0.7)
            }

    return {
        "answer": "Insufficient reliable information found to answer the question.",
        "sources": [],
        "confidence": 0.2
    }