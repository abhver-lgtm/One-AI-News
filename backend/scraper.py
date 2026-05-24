import feedparser
import re
import html
import time
import logging
from datetime import datetime, timezone
from typing import List, Tuple
from dateutil import parser as date_parser
from database import SOURCES, insert_article

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def strip_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def truncate_text(text: str, length: int = 200) -> str:
    if len(text) <= length:
        return text
    return text[:length].rsplit(" ", 1)[0] + "..."


def parse_date(entry) -> datetime:
    """Try to extract published date from feed entry and normalize to UTC."""
    dt = None
    for field in ("published_parsed", "updated_parsed"):
        val = getattr(entry, field, None)
        if val:
            try:
                dt = datetime(*val[:6])
                break
            except Exception:
                pass
    if not dt:
        for field in ("published", "updated"):
            val = getattr(entry, field, None)
            if val:
                try:
                    dt = date_parser.parse(val)
                    break
                except Exception:
                    pass
    if not dt:
        dt = datetime.utcnow()

    # Normalize to UTC
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def fetch_rss(rss_url: str, delay: float = 2.0) -> List[dict]:
    """Fetch and parse an RSS feed with rate limiting."""
    try:
        logger.info(f"Fetching RSS: {rss_url}")
        feed = feedparser.parse(rss_url)
        time.sleep(delay)
        entries = []
        for entry in feed.entries[:20]:  # limit entries per source
            title = strip_html(entry.get("title", "Untitled"))
            summary = entry.get("summary", entry.get("description", ""))
            clean_summary = strip_html(summary)
            link = entry.get("link", "")
            if not link:
                continue
            published = parse_date(entry)
            entries.append({
                "title": title,
                "description": truncate_text(clean_summary, 200),
                "url": link,
                "published_at": published,
            })
        return entries
    except Exception as e:
        logger.error(f"Error fetching {rss_url}: {e}")
        return []


def scrape_all() -> Tuple[int, int]:
    """Scrape all configured sources. Returns (added, skipped)."""
    added = 0
    skipped = 0

    for source in SOURCES:
        rss_url = source.get("rss")
        if not rss_url:
            continue
        entries = fetch_rss(rss_url, delay=2.0)
        for entry in entries:
            article_id = insert_article(
                title=entry["title"],
                description=entry["description"],
                url=entry["url"],
                source=source["source"],
                source_name=source["name"],
                published_at=entry["published_at"],
            )
            if article_id is not None:
                added += 1
            else:
                skipped += 1

    logger.info(f"Scrape complete: {added} added, {skipped} skipped")
    return added, skipped


if __name__ == "__main__":
    scrape_all()
