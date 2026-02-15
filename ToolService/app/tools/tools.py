import httpx
import re
import json
import math
from typing import List, Dict, Any
from ddgs import DDGS
from bs4 import BeautifulSoup
from readability import Document
from langchain_core.messages import SystemMessage
from langchain_groq import ChatGroq

# web search
def search_web(query: str, max_results: int = 5):
    """Search the web for the given query and return a list of urls."""
    results = []
    with DDGS() as ddg:
        for result in ddg.text(query, max_results=max_results):
            results.append({
                "title": result.get("title"),
                "url": result.get("href"),
                "snippet": result.get("body")
            })
    return results

# fetch html
def fetch_html(url: str, timeout: int = 10):
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        with httpx.Client(follow_redirects=True, timeout=timeout) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code >= 400:
                print(f"[fetch_html] Bad status {resp.status_code} for {url}")
                return None
            return resp.text
    except Exception as e:
        print(f"[fetch_html] Failed {url}: {e}")
        return None

# parse page
def parse_page(html: str):
    soup = BeautifulSoup(html, "html.parser")

    # Remove junk
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    # Title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Meta description
    meta_description = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_description = meta_tag["content"].strip()

    # Extract visible text
    text = "\n".join(soup.stripped_strings)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Extract JSON-LD structured data
    json_ld = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            json_ld.append(data)
        except Exception:
            continue

    return {
        "title": title,
        "meta_description": meta_description,
        "json_ld": json_ld,
        "text": text
    }

# chunking
def chunk_text(text: str, chunk_size: int = 1500):
    paragraphs = text.split("\n")
    chunks = []
    current = ""

    for p in paragraphs:
        if len(current) + len(p) < chunk_size:
            current += p + "\n"
        else:
            chunks.append(current.strip())
            current = p + "\n"

    if current:
        chunks.append(current.strip())

    return chunks

# research
async def research(task: str, question: str, max_sources: int = 5):

    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.0,
        max_tokens=400
    )

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


    # Generate Search Query

    query_prompt = f"""
You are generating a web search query.

Task:
{task}

Question:
{question}

Return ONLY valid JSON:

{{
  "query": "<concise search query>"
}}
"""
    query_result = _invoke_json(query_prompt)

    if not query_result or "query" not in query_result:
        return {
            "answer": "Failed to generate search query.",
            "sources": [],
            "confidence": 0.0
        }

    search_query = query_result["query"]
    print(f"[Research] Query: {search_query}")

    # Search
    results = search_web(search_query, max_results=max_sources)

    # Iterate Through Results
    for result in results:
        url = result.get("url")
        if not url:
            continue

        print(f"[Research] Fetching {url}")

        html = fetch_html(url)
        if not html:
            continue

        parsed = parse_page(html)

        if len(parsed["text"]) < 300:
            print(f"[Research] Skipping low-content page {url}")
            continue

        chunks = chunk_text(parsed["text"])

        # Check Sufficiency per Chunk
        for chunk in chunks[:5]:  # limit chunk checks for efficiency

            suff_prompt = f"""
You are evaluating whether this text contains enough factual information to answer a question.

Task:
{task}

Question:
{question}

Text:
{chunk}

Return ONLY valid JSON:

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

                extract_prompt = f"""
Extract a precise factual answer.

Task:
{task}

Question:
{question}

Text:
{chunk}

Return ONLY valid JSON:

{{
  "answer": "<clear factual answer>"
}}
"""
                extracted = _invoke_json(extract_prompt)
                if not extracted or "answer" not in extracted:
                    continue

                return {
                    "answer": extracted["answer"],
                    "sources": [url],
                    "confidence": sufficiency.get("confidence", 0.7)
                }

    return {
        "answer": "Insufficient reliable information found to answer the question.",
        "sources": [],
        "confidence": 0.2
    }

# report generation
def generate_report(research_results: List[Dict[str, Any]], title: str = "Research Report", max_findings: int = 5) -> str:
    report_lines = [f"# {title}\n"]

    if not research_results:
        report_lines.append("No research results available.\n")
        return "\n".join(report_lines)

    for idx, res in enumerate(research_results[:max_findings], start=1):
        answer = res.get("answer", "No answer")
        sources = res.get("sources", [])
        confidence = res.get("confidence", 0.0)

        report_lines.append(f"## Finding {idx}")
        report_lines.append(f"{answer}")

        # Only include top 1-2 sources to save tokens
        if sources:
            report_lines.append("Sources:")
            for src in sources[:2]:
                report_lines.append(f"- {src}")

    return "\n".join(report_lines)

# computation
def compute_expression(expression: str, variables: Dict[str, float] = None) -> Dict[str, Any]:
    safe_globals = {
        "__builtins__": {},
        "abs": abs,
        "round": round,
        "min": min,
        "max": max,
        "pow": pow,
        "math": math
    }

    safe_locals = variables.copy() if variables else {}

    try:
        result = eval(expression, safe_globals, safe_locals)
        return {"result": result}
    except Exception as e:
        return {"error": str(e)}