import asyncio
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, field


@dataclass
class LogEntry:
    time: str
    message: str


@dataclass
class ScrapeProgressState:
    status: str = "idle"  # idle, scraping, analyzing, done
    current_source: Optional[str] = None
    sources_total: int = 0
    sources_done: int = 0
    articles_found: int = 0
    articles_added: int = 0
    articles_skipped: int = 0
    logs: List[Dict] = field(default_factory=list)
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    analyze_done: int = 0
    analyze_total: int = 0


class ScrapeProgressManager:
    def __init__(self):
        self._state = ScrapeProgressState()
        self._lock = asyncio.Lock()
        self._subscribers: List[asyncio.Queue] = []

    async def start(self, sources_total: int):
        async with self._lock:
            self._state = ScrapeProgressState(
                status="scraping",
                sources_total=sources_total,
                started_at=datetime.utcnow().isoformat(),
            )
        await self._broadcast()

    async def log(self, message: str):
        entry = {"time": datetime.utcnow().isoformat(), "message": message}
        async with self._lock:
            self._state.logs.append(entry)
            # Keep last 100 logs
            if len(self._state.logs) > 100:
                self._state.logs = self._state.logs[-100:]
        await self._broadcast()

    async def set_source(self, source_name: str):
        async with self._lock:
            self._state.current_source = source_name
        await self._broadcast()

    async def source_done(self, found: int, added: int, skipped: int):
        async with self._lock:
            self._state.sources_done += 1
            self._state.articles_found += found
            self._state.articles_added += added
            self._state.articles_skipped += skipped
        await self._broadcast()

    async def start_analyze(self, total: int):
        async with self._lock:
            self._state.status = "analyzing"
            self._state.analyze_total = total
            self._state.analyze_done = 0
        await self._broadcast()

    async def analyze_step(self, done: int):
        async with self._lock:
            self._state.analyze_done = done
        await self._broadcast()

    async def finish(self):
        async with self._lock:
            self._state.status = "done"
            self._state.finished_at = datetime.utcnow().isoformat()
            self._state.current_source = None
        await self._broadcast()

    async def reset(self):
        async with self._lock:
            self._state = ScrapeProgressState()
        await self._broadcast()

    def get_state(self) -> ScrapeProgressState:
        return self._state

    async def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=10)
        async with self._lock:
            await queue.put(self._state)
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    async def _broadcast(self):
        dead = []
        async with self._lock:
            state = self._state
        for q in self._subscribers:
            try:
                q.put_nowait(state)
            except asyncio.QueueFull:
                pass
            except Exception:
                dead.append(q)
        for q in dead:
            self._subscribers.remove(q)


progress_manager = ScrapeProgressManager()
