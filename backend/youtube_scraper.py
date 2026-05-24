import feedparser
import re
import html
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Tuple, Optional
from dateutil import parser as date_parser
from database import YOUTUBE_CHANNELS, insert_video
from progress import ScrapeProgressManager

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


def is_short(title: str) -> bool:
    """Detect YouTube Shorts by title heuristics."""
    t = title.lower()
    return '#shorts' in t or '#short' in t or '｜shorts' in t or 'shorts' in t


def extract_video_id(youtube_url: str) -> Optional[str]:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r"youtube\.com/watch\?v=([a-zA-Z0-9_-]+)",
        r"youtu\.be/([a-zA-Z0-9_-]+)",
        r"youtube\.com/embed/([a-zA-Z0-9_-]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    return None


def parse_date(entry) -> datetime:
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

    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def fetch_channel_rss(channel_id: str) -> List[dict]:
    rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    try:
        logger.info(f"Fetching YouTube RSS: {channel_id}")
        feed = feedparser.parse(rss_url)
        entries = []
        for entry in feed.entries[:10]:  # limit to 10 latest videos per channel
            title = strip_html(entry.get("title", "Untitled"))
            summary = entry.get("summary", entry.get("description", ""))
            clean_summary = strip_html(summary)
            link = entry.get("link", "")
            if not link:
                continue

            video_id = extract_video_id(link)
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg" if video_id else None

            published = parse_date(entry)
            entries.append({
                "title": title,
                "description": truncate_text(clean_summary, 200),
                "url": link,
                "thumbnail_url": thumbnail_url,
                "published_at": published,
                "is_short": is_short(title),
            })
        return entries
    except Exception as e:
        logger.error(f"Error fetching YouTube RSS for {channel_id}: {e}")
        return []


async def scrape_youtube(progress: Optional[ScrapeProgressManager] = None) -> Tuple[int, int]:
    added = 0
    skipped = 0

    if progress:
        await progress.log("🎬 Starting YouTube video scrape...")

    for channel in YOUTUBE_CHANNELS:
        channel_id = channel["channel_id"]
        if progress:
            await progress.set_source(channel["name"])
            await progress.log(f"📡 Fetching {channel['name']}...")

        entries = fetch_channel_rss(channel_id)
        source_added = 0
        source_skipped = 0

        for entry in entries:
            video_id = insert_video(
                title=entry["title"],
                description=entry["description"],
                url=entry["url"],
                thumbnail_url=entry["thumbnail_url"] or "",
                channel_id=channel_id,
                channel_name=channel["name"],
                published_at=entry["published_at"],
                is_short=entry.get("is_short", False),
            )
            if video_id is not None:
                added += 1
                source_added += 1
            else:
                skipped += 1
                source_skipped += 1

        if progress:
            await progress.source_done(len(entries), source_added, source_skipped)
            await progress.log(
                f"✅ {channel['name']}: {source_added} new, {source_skipped} dupes (of {len(entries)} fetched)"
            )

        await asyncio.sleep(1.5)

    if progress:
        await progress.log(f"🏁 YouTube scrape complete! Total: {added} added, {skipped} skipped")

    logger.info(f"YouTube scrape complete: {added} added, {skipped} skipped")
    return added, skipped
