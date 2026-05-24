import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager
from typing import List, Optional
from models import Article, SourceInfo, Video

DB_PATH = os.environ.get("DATABASE_PATH", "data/news.db")

SOURCES = [
    {"name": "OpenAI Blog", "source": "openai", "color": "#10a37f", "rss": "https://openai.com/blog/rss.xml"},
    {"name": "Google AI Blog", "source": "google-ai", "color": "#4285f4", "rss": "https://ai.googleblog.com/feeds/posts/default"},
    {"name": "Anthropic Blog", "source": "anthropic", "color": "#d4a574", "rss": "https://www.anthropic.com/blog/rss.xml"},
    {"name": "Meta AI Blog", "source": "meta-ai", "color": "#0668e1", "rss": "https://ai.meta.com/blog/rss/"},
    {"name": "Microsoft Research", "source": "microsoft-research", "color": "#00a4ef", "rss": "https://www.microsoft.com/en-us/research/feed/"},
    {"name": "Hugging Face Blog", "source": "huggingface", "color": "#ffbd59", "rss": "https://huggingface.co/blog/feed.xml"},
    {"name": "NVIDIA AI Blog", "source": "nvidia", "color": "#76b900", "rss": "https://blogs.nvidia.com/blog/category/artificial-intelligence/feed/"},
    {"name": "DeepMind Blog", "source": "deepmind", "color": "#0053d6", "rss": "https://deepmind.google/blog/rss.xml"},
    {"name": "arXiv cs.AI", "source": "arxiv", "color": "#b31b1b", "rss": "http://rss.arxiv.org/rss/cs.AI"},
    {"name": "MIT Technology Review", "source": "mit-tech-review", "color": "#000000", "rss": "https://www.technologyreview.com/feed/"},
    {"name": "TechCrunch AI", "source": "techcrunch", "color": "#0a9f00", "rss": "https://techcrunch.com/category/artificial-intelligence/feed/"},
    {"name": "The Verge AI", "source": "the-verge", "color": "#e2127a", "rss": "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml"},
    {"name": "Wired AI", "source": "wired", "color": "#000000", "rss": "https://www.wired.com/tag/artificial-intelligence/rss/"},
]

YOUTUBE_CHANNELS = [
    {"name": "Two Minute Papers", "channel_id": "UCbfYPyITQ-7l4upoX8nvctg", "color": "#ff0000"},
    {"name": "Matt Wolfe", "channel_id": "UChpleBmo18P08aKCIgti38g", "color": "#ff0000"},
    {"name": "AI Explained", "channel_id": "UCp_9GybIeJV5CBvLlJkFvA", "color": "#ff0000"},
    {"name": "Yannic Kilcher", "channel_id": "UCZHmQk67mSJgfCCTn7xBfew", "color": "#ff0000"},
    {"name": "Matthew Berman", "channel_id": "UCzi5kcwU8aT4aLR7LcYhfWQ", "color": "#ff0000"},
    {"name": "MattVidPro AI", "channel_id": "UC5Wz4fFacYuON6IKbhSa7Zw", "color": "#ff0000"},
    {"name": "Fireship", "channel_id": "UCsBjURrPoezykLs9EqgamOA", "color": "#ff0000"},
    {"name": "Sentdex", "channel_id": "UCfzlCWGWYyIQ0aLC5w48gBQ", "color": "#ff0000"},
    {"name": "Lex Fridman", "channel_id": "UCSHZKyawb77ixDdsGog4iWA", "color": "#ff0000"},
    {"name": "ColdFusion", "channel_id": "UC4QZ_LsYcvcq7qOsOhpAX4A", "color": "#ff0000"},
    {"name": "Siraj Raval", "channel_id": "UCWN3xxRkmTPmbKwht9FuE5A", "color": "#ff0000"},
]


def ensure_db_dir():
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)


def init_db():
    ensure_db_dir()
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                url TEXT NOT NULL UNIQUE,
                source TEXT NOT NULL,
                source_name TEXT NOT NULL,
                published_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                relevance_score REAL DEFAULT 50.0,
                topic_emoji TEXT DEFAULT '📰'
            )
        """)
        # Add new columns if table exists without them
        try:
            conn.execute("ALTER TABLE articles ADD COLUMN relevance_score REAL DEFAULT 50.0")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE articles ADD COLUMN topic_emoji TEXT DEFAULT '📰'")
        except sqlite3.OperationalError:
            pass
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_articles_relevance ON articles(relevance_score DESC)
        """)

        # Videos table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                url TEXT NOT NULL UNIQUE,
                thumbnail_url TEXT,
                channel_id TEXT NOT NULL,
                channel_name TEXT NOT NULL,
                published_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_short INTEGER DEFAULT 0
            )
        """)
        try:
            conn.execute("ALTER TABLE videos ADD COLUMN is_short INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published_at DESC)
        """)
        conn.commit()


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def insert_article(title: str, description: str, url: str, source: str, source_name: str, published_at: datetime) -> Optional[int]:
    with get_db() as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO articles (title, description, url, source, source_name, published_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (title, description, url, source, source_name, published_at.isoformat())
            )
            conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None


def update_article_metadata(article_id: int, relevance_score: float, topic_emoji: str):
    with get_db() as conn:
        conn.execute(
            "UPDATE articles SET relevance_score = ?, topic_emoji = ? WHERE id = ?",
            (relevance_score, topic_emoji, article_id)
        )
        conn.commit()


def get_articles(source: Optional[str] = None, limit: int = 500, sort_by: str = "published") -> List[Article]:
    with get_db() as conn:
        order = "published_at DESC"
        if sort_by == "relevance":
            order = "relevance_score DESC, published_at DESC"

        if source:
            rows = conn.execute(
                f"SELECT * FROM articles WHERE source = ? ORDER BY {order} LIMIT ?",
                (source, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                f"SELECT * FROM articles ORDER BY {order} LIMIT ?",
                (limit,)
            ).fetchall()
        return [Article(
            id=r["id"],
            title=r["title"],
            description=r["description"],
            url=r["url"],
            source=r["source"],
            source_name=r["source_name"],
            published_at=datetime.fromisoformat(r["published_at"]) if r["published_at"] else datetime.utcnow(),
            created_at=datetime.fromisoformat(r["created_at"]) if r["created_at"] else datetime.utcnow(),
            relevance_score=r["relevance_score"] if r["relevance_score"] is not None else 50.0,
            topic_emoji=r["topic_emoji"] or "📰",
        ) for r in rows]


def get_unanalyzed_articles(limit: int = 30) -> List[Article]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM articles WHERE relevance_score = 50.0 AND topic_emoji = '📰' ORDER BY published_at DESC LIMIT ?",
            (limit,)
        ).fetchall()
        return [Article(
            id=r["id"],
            title=r["title"],
            description=r["description"],
            url=r["url"],
            source=r["source"],
            source_name=r["source_name"],
            published_at=datetime.fromisoformat(r["published_at"]) if r["published_at"] else datetime.utcnow(),
            created_at=datetime.fromisoformat(r["created_at"]) if r["created_at"] else datetime.utcnow(),
            relevance_score=r["relevance_score"] if r["relevance_score"] is not None else 50.0,
            topic_emoji=r["topic_emoji"] or "📰",
        ) for r in rows]


def get_sources() -> List[SourceInfo]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT source, source_name, COUNT(*) as cnt FROM articles GROUP BY source, source_name"
        ).fetchall()
        counts = {r["source"]: r["cnt"] for r in rows}
        result = []
        for s in SOURCES:
            result.append(SourceInfo(
                name=s["name"],
                source=s["source"],
                color=s["color"],
                article_count=counts.get(s["source"], 0)
            ))
        return result


def get_article_count() -> int:
    with get_db() as conn:
        row = conn.execute("SELECT COUNT(*) as cnt FROM articles").fetchone()
        return row["cnt"] if row else 0


# Video operations

def insert_video(title: str, description: str, url: str, thumbnail_url: str, channel_id: str, channel_name: str, published_at: datetime, is_short: bool = False) -> Optional[int]:
    with get_db() as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO videos (title, description, url, thumbnail_url, channel_id, channel_name, published_at, is_short)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (title, description, url, thumbnail_url, channel_id, channel_name, published_at.isoformat(), 1 if is_short else 0)
            )
            conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None


def get_videos(channel_id: Optional[str] = None, limit: int = 100) -> List[Video]:
    with get_db() as conn:
        if channel_id:
            rows = conn.execute(
                "SELECT * FROM videos WHERE channel_id = ? ORDER BY published_at DESC LIMIT ?",
                (channel_id, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM videos ORDER BY published_at DESC LIMIT ?",
                (limit,)
            ).fetchall()
        return [Video(
            id=r["id"],
            title=r["title"],
            description=r["description"],
            url=r["url"],
            thumbnail_url=r["thumbnail_url"],
            channel_id=r["channel_id"],
            channel_name=r["channel_name"],
            published_at=datetime.fromisoformat(r["published_at"]) if r["published_at"] else datetime.utcnow(),
            created_at=datetime.fromisoformat(r["created_at"]) if r["created_at"] else datetime.utcnow(),
            is_short=bool(r["is_short"]),
        ) for r in rows]


def get_video_channels() -> List[SourceInfo]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT channel_id, channel_name, COUNT(*) as cnt FROM videos GROUP BY channel_id, channel_name"
        ).fetchall()
        counts = {r["channel_id"]: r["cnt"] for r in rows}
        result = []
        for c in YOUTUBE_CHANNELS:
            result.append(SourceInfo(
                name=c["name"],
                source=c["channel_id"],
                color=c["color"],
                article_count=counts.get(c["channel_id"], 0)
            ))
        return result


def get_video_count() -> int:
    with get_db() as conn:
        row = conn.execute("SELECT COUNT(*) as cnt FROM videos").fetchone()
        return row["cnt"] if row else 0
