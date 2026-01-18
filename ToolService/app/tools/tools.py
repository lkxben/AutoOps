import httpx

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

# http client
# async def http_get(
#     url: str,
#     headers: dict | None = None,
#     query_params: dict | None = None,
#     timeout_seconds: int = 10,
# ) -> dict:
#     """Send an HTTP GET request and return status code, headers, and response body."""
#     async with httpx.AsyncClient(timeout=timeout_seconds) as client:
#         response = await client.get(url, headers=headers, params=query_params)

#     return {
#         "status_code": response.status_code,
#         "headers": dict(response.headers),
#         "body": response.text,
#     }


# async def http_post(
#     url: str,
#     json_body: dict,
#     headers: dict | None = None,
#     timeout_seconds: int = 10,
# ) -> dict:
#     """Send an HTTP POST request with a JSON body and return status code, headers, and response body."""
#     async with httpx.AsyncClient(timeout=timeout_seconds) as client:
#         response = await client.post(url, json=json_body, headers=headers)

#     return {
#         "status_code": response.status_code,
#         "headers": dict(response.headers),
#         "body": response.text,
#     }

from ddgs import DDGS

def search_web(query: str, max_results: int = 5):
    """
    Perform a DuckDuckGo search and return top results.
    """
    results = []
    with DDGS() as ddg:
        for result in ddg.text(query, max_results=max_results):
            results.append({
                "title": result.get("title"),
                "url": result.get("href")
            })
    return results