import os
import json
import logging
from typing import List, Tuple
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = os.environ.get("DEEPSEEK_API_KEY", "sk-3a895b6948a94029bf21755bdf5cdbc1")
API_URL = "https://api.deepseek.com/chat/completions"


def build_prompt(articles: List[dict]) -> str:
    lines = []
    for i, a in enumerate(articles):
        desc = a.get("description", "")[:150]
        lines.append(f"[{i}] Title: {a['title']}\nDescription: {desc}\nSource: {a['source_name']}")
    articles_text = "\n\n".join(lines)

    prompt = f"""You are an AI industry analyst. Analyze these news articles and rank them by relevance to the AI industry.

For each article, output ONLY:
- relevance_score: integer 0-100 (100 = breakthrough)
- topic_emoji: a single emoji

Articles:
{articles_text}

Respond with ONLY a JSON array. No markdown, no explanation, no code blocks. Example:
[{{"index": 0, "relevance_score": 85, "topic_emoji": "🤖"}}]"""
    return prompt


def _parse_response(content: str) -> List[Tuple[int, float, str]]:
    """Extract JSON array from DeepSeek response."""
    content = content.strip()
    # Strip markdown fences
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    # Sometimes DeepSeek adds text before/after JSON - find the array
    start = content.find("[")
    end = content.rfind("]")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"No JSON array found in response: {content[:200]}")
    content = content[start:end+1]

    results = json.loads(content)
    output = []
    for r in results:
        idx = r.get("index", 0)
        score = float(r.get("relevance_score", 50))
        emoji = r.get("topic_emoji", "📰")
        output.append((idx, score, emoji))
    return output


def analyze_articles_sync(articles: List[dict]) -> List[Tuple[int, float, str]]:
    """Analyze articles with DeepSeek. Returns list of (index, score, emoji)."""
    if not API_KEY:
        logger.warning("DEEPSEEK_API_KEY not set, skipping analysis")
        return []
    if not articles:
        logger.info("No articles to analyze")
        return []

    prompt = build_prompt(articles)
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 4000,
    }

    try:
        logger.info(f"Sending {len(articles)} articles to DeepSeek for analysis...")
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(API_URL, headers=headers, json=payload)
            logger.info(f"DeepSeek response status: {resp.status_code}")
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            logger.debug(f"DeepSeek raw response: {content[:500]}")

            output = _parse_response(content)
            logger.info(f"DeepSeek analyzed {len(output)} articles successfully")
            return output
    except httpx.HTTPStatusError as e:
        logger.error(f"DeepSeek HTTP error: {e.response.status_code} - {e.response.text[:500]}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"DeepSeek JSON parse error: {e}")
        return []
    except Exception as e:
        logger.error(f"DeepSeek analysis failed: {type(e).__name__}: {e}")
        return []


def test_deepseek() -> dict:
    """Test DeepSeek API connectivity with a simple prompt."""
    if not API_KEY:
        return {"success": False, "error": "API key not set"}

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": 'Return JSON only: [{"index": 0, "relevance_score": 99, "topic_emoji": "🧪"}]'}],
        "temperature": 0.3,
        "max_tokens": 200,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            result = _parse_response(content)
            return {"success": True, "result": result, "model": data.get("model")}
    except Exception as e:
        return {"success": False, "error": str(e)}
