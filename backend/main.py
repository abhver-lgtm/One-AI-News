import os
import json
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from apscheduler.schedulers.background import BackgroundScheduler

from database import init_db, get_articles, get_sources, get_article_count, get_unanalyzed_articles, update_article_metadata, get_videos, get_video_channels, get_video_count
from scraper import scrape_all
from youtube_scraper import scrape_youtube
from deepseek import analyze_articles_sync
from progress import progress_manager, ScrapeProgressState
from models import Article, SourceInfo, RefreshResponse, AnalyzeResponse, Video

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REFRESH_INTERVAL_MINUTES = int(os.environ.get("REFRESH_INTERVAL_MINUTES", "15"))
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

scheduler = BackgroundScheduler()


def scheduled_scrape():
    try:
        logger.info("Running scheduled scrape job...")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(scrape_all())
        loop.run_until_complete(scrape_youtube())
        loop.close()
        logger.info("Scheduled scrape done")
    except Exception as e:
        logger.error(f"Scheduled scrape failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    await scrape_all()
    await scrape_youtube()
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
    allow_origins=[o.strip() for o in CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def do_refresh_with_progress(include_youtube: bool = True):
    await progress_manager.reset()
    await scrape_all(progress=progress_manager)
    if include_youtube:
        await scrape_youtube(progress=progress_manager)
    await progress_manager.finish()


async def do_analyze_with_progress():
    unanalyzed = get_unanalyzed_articles(limit=20)
    if not unanalyzed:
        await progress_manager.log("🤖 No new articles to analyze")
        await progress_manager.start_analyze(0)
        await progress_manager.finish()
        return

    await progress_manager.start_analyze(len(unanalyzed))
    await progress_manager.log(f"🧠 Sending {len(unanalyzed)} articles to DeepSeek for analysis...")

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
            await progress_manager.analyze_step(analyzed_count)
            await progress_manager.log(
                f"✨ Analyzed: {article.title[:50]}... → Score {score}, Emoji {emoji}"
            )

    await progress_manager.log(f"🏁 Analysis complete! {analyzed_count} articles ranked")
    await progress_manager.finish()


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
def refresh_news(background_tasks: BackgroundTasks):
    if progress_manager.get_state().status in ("scraping", "analyzing"):
        return RefreshResponse(
            success=False,
            message="A scrape is already in progress",
            added=0,
            skipped=0,
        )
    background_tasks.add_task(do_refresh_with_progress)
    return RefreshResponse(
        success=True,
        message="Scrape started in background",
        added=0,
        skipped=0,
    )


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze_news(background_tasks: BackgroundTasks):
    if progress_manager.get_state().status in ("scraping", "analyzing"):
        return AnalyzeResponse(
            success=False,
            message="A task is already in progress",
            analyzed=0,
        )
    background_tasks.add_task(do_analyze_with_progress)
    return AnalyzeResponse(
        success=True,
        message="Analysis started in background",
        analyzed=0,
    )


# Videos API

@app.get("/api/videos", response_model=List[Video])
def read_videos(
    channel_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=200),
):
    return get_videos(channel_id=channel_id, limit=limit)


@app.get("/api/video-channels", response_model=List[SourceInfo])
def read_video_channels():
    return get_video_channels()


@app.post("/api/refresh/videos", response_model=RefreshResponse)
def refresh_videos(background_tasks: BackgroundTasks):
    if progress_manager.get_state().status in ("scraping", "analyzing"):
        return RefreshResponse(
            success=False,
            message="A scrape is already in progress",
            added=0,
            skipped=0,
        )
    async def do_youtube_only():
        await progress_manager.reset()
        await scrape_youtube(progress=progress_manager)
        await progress_manager.finish()
    background_tasks.add_task(do_youtube_only)
    return RefreshResponse(
        success=True,
        message="YouTube scrape started in background",
        added=0,
        skipped=0,
    )


@app.get("/api/progress")
def read_progress():
    state = progress_manager.get_state()
    return {
        "status": state.status,
        "current_source": state.current_source,
        "sources_total": state.sources_total,
        "sources_done": state.sources_done,
        "articles_found": state.articles_found,
        "articles_added": state.articles_added,
        "articles_skipped": state.articles_skipped,
        "analyze_done": state.analyze_done,
        "analyze_total": state.analyze_total,
        "logs": state.logs[-20:],
        "started_at": state.started_at,
        "finished_at": state.finished_at,
    }


@app.get("/api/progress/stream")
async def progress_stream():
    async def event_generator():
        queue = await progress_manager.subscribe()
        try:
            while True:
                state: ScrapeProgressState = await asyncio.wait_for(queue.get(), timeout=60.0)
                payload = json.dumps({
                    "status": state.status,
                    "current_source": state.current_source,
                    "sources_total": state.sources_total,
                    "sources_done": state.sources_done,
                    "articles_found": state.articles_found,
                    "articles_added": state.articles_added,
                    "articles_skipped": state.articles_skipped,
                    "analyze_done": state.analyze_done,
                    "analyze_total": state.analyze_total,
                    "logs": state.logs[-10:],
                    "started_at": state.started_at,
                    "finished_at": state.finished_at,
                })
                yield f"data: {payload}\n\n"
        except asyncio.TimeoutError:
            yield "data: {\"status\": \"timeout\"}\n\n"
        finally:
            progress_manager.unsubscribe(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/stats")
def read_stats():
    return {
        "total_articles": get_article_count(),
        "total_videos": get_video_count(),
        "last_refresh": datetime.utcnow().isoformat(),
        "refresh_interval_minutes": REFRESH_INTERVAL_MINUTES,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
