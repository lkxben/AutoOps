import httpx
from ddgs import DDGS
from bs4 import BeautifulSoup
from readability import Document
import re
# from app.messaging.notif_call_publisher import NotifCallPublisher

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
Use after web_search when a relevant URL is known.
Returns cleaned plain text.
    """

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    }

    with httpx.Client(follow_redirects=True, timeout=10) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()

    html = resp.text

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

    lines = []
    for elem in soup.find_all(["h1", "h2", "h3", "p", "li"]):
        text = elem.get_text(strip=True)
        if text:
            lines.append(text)

    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)

    title = doc.title()
    if not title:
        raw_soup = BeautifulSoup(html, "html.parser")
        if raw_soup.title:
            title = raw_soup.title.get_text(strip=True)

    output = f"Title: {title}\n\n{text}".strip()

    if len(text.strip()) < 200:
        return "ERROR: Failed to extract meaningful main content."

    return output[:max_chars]