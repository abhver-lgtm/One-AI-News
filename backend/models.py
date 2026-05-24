from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ArticleBase(BaseModel):
    title: str
    description: str
    url: str
    source: str
    source_name: str
    published_at: datetime


class ArticleCreate(ArticleBase):
    pass


class Article(ArticleBase):
    id: int
    created_at: datetime
    relevance_score: float = 50.0
    topic_emoji: str = "📰"

    class Config:
        from_attributes = True


class SourceInfo(BaseModel):
    name: str
    source: str
    color: str
    article_count: int


class RefreshResponse(BaseModel):
    success: bool
    message: str
    added: int
    skipped: int


class AnalyzeResponse(BaseModel):
    success: bool
    message: str
    analyzed: int
