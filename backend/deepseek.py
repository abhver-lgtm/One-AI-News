import os
import json
import logging
from typing import List, Dict, Tuple
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = os.environ.get("DEEPSEEK_API_KEY", "sk-3a895b6948a94029bf21755bdf5cdbc1")
API_URL = "https://api.deepseek.com/chat/completions"


def build_prompt(articles: List[dict]) -> str:
    lines = []
    for i, a in enumerate(articles):
        lines.append(f"[{i}] Title: {a['title']}\nDescription: {a['description']}\nSource: {a['source_name']}")
    articles_text = "\n\n".join(lines)

    prompt = f"""You are an AI industry analyst. Analyze the following news articles and rank them by relevance/importance to the AI industry.

For each article, provide:
1. relevance_score: integer 0-100 (100 = breakthrough/most important)
2. topic_emoji: a single emoji that best represents the article topic

Articles:
{articles_text}

Respond ONLY with a JSON array in this exact format (no markdown, no explanation):
[
  {{"index": 0, "relevance_score": 85, "topic_emoji": "🤖"}},
  ...
]
"""
    return prompt


async def analyze_articles(articles: List[dict]) -> List[Tuple[int, float, str]]:
    """Analyze articles with DeepSeek. Returns list of (index, score, emoji)."""
    if not API_KEY:
        logger.warning("DEEPSEEK_API_KEY not set, skipping analysis")
        return []
    if not articles:
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
        "max_tokens": 2000,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]

            # Strip markdown code fences if present
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            results = json.loads(content)
            output = []
            for r in results:
                idx = r.get("index", 0)
                score = float(r.get("relevance_score", 50))
                emoji = r.get("topic_emoji", "📰")
                output.append((idx, score, emoji))
            logger.info(f"DeepSeek analyzed {len(articles)} articles")
            return output
    except Exception as e:
        logger.error(f"DeepSeek analysis failed: {e}")
        return []


def analyze_articles_sync(articles: List[dict]) -> List[Tuple[int, float, str]]:
    """Synchronous wrapper for analyze_articles."""
    if not API_KEY:
        logger.warning("DEEPSEEK_API_KEY not set, skipping analysis")
        return []
    if not articles:
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
        "max_tokens": 2000,
    }

    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]

            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            results = json.loads(content)
            output = []
            for r in results:
                idx = r.get("index", 0)
                score = float(r.get("relevance_score", 50))
                emoji = r.get("topic_emoji", "📰")
                output.append((idx, score, emoji))
            logger.info(f"DeepSeek analyzed {len(articles)} articles")
            return output
    except Exception as e:
        logger.error(f"DeepSeek analysis failed: {e}")
        return []
