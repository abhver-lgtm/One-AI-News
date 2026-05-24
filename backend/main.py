import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from database import init_db, get_articles, get_sources, get_article_count, get_unanalyzed_articles, update_article_metadata
from scraper import scrape_all
from deepseek import analyze_articles_sync
from models import Article, SourceInfo, RefreshResponse, AnalyzeResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REFRESH_INTERVAL_MINUTES = int(os.environ.get("REFRESH_INTERVAL_MINUTES", "15"))

scheduler = BackgroundScheduler()


def scheduled_scrape():
    try:
        logger.info("Running scheduled scrape job...")
        added, skipped = scrape_all()
        logger.info(f"Scheduled scrape done: {added} added, {skipped} skipped")
    except Exception as e:
        logger.error(f"Scheduled scrape failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Initial scrape on startup
    scheduled_scrape()
    scheduler.add_job(scheduled_scrape, "interval", minutes=REFRESH_INTERVAL_MINUTES, id="news_scrape")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="AI News Aggregator API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/news", response_model=List[Article])
def read_news(
    source: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=1000),
    sort_by: str = Query("published", regex="^(published|relevance)$"),
):
    return get_articles(source=source, limit=limit, sort_by=sort_by)


@app.get("/api/sources", response_model=List[SourceInfo])
def read_sources():
    return get_sources()


@app.post("/api/refresh", response_model=RefreshResponse)
def refresh_news():
    added, skipped = scrape_all()
    return RefreshResponse(
        success=True,
        message="Refresh completed",
        added=added,
        skipped=skipped,
    )


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze_news():
    """Analyze unanalyzed articles with DeepSeek for relevance scoring and topic emojis."""
    unanalyzed = get_unanalyzed_articles(limit=20)
    if not unanalyzed:
        return AnalyzeResponse(success=True, message="No new articles to analyze", analyzed=0)

    payload = [
        {"title": a.title, "description": a.description, "source_name": a.source_name}
        for a in unanalyzed
    ]
    results = analyze_articles_sync(payload)
    analyzed_count = 0
    for idx, score, emoji in results:
        if 0 <= idx < len(unanalyzed):
            article = unanalyzed[idx]
            update_article_metadata(article.id, score, emoji)
            analyzed_count += 1

    return AnalyzeResponse(
        success=True,
        message=f"Analyzed {analyzed_count} articles with DeepSeek",
        analyzed=analyzed_count,
    )


@app.get("/api/stats")
def read_stats():
    return {
        "total_articles": get_article_count(),
        "last_refresh": datetime.utcnow().isoformat(),
        "refresh_interval_minutes": REFRESH_INTERVAL_MINUTES,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
