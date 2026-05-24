import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager
from typing import List, Optional
from models import Article, SourceInfo

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
