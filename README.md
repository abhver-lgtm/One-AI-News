# AI News Aggregator

A full-stack AI news aggregator that collects articles from top AI research labs, companies, and tech journalism sources. Features a dark/light theme, DeepSeek AI-powered relevance ranking, topic emojis, a monospace code-like font, and a clean card-based UI.

## Features

- **Dark & Light Themes** — toggle instantly with a sun/moon button; preference is saved in localStorage
- **JetBrains Mono font** — code-like monospace typography for readability
- **DeepSeek AI Ranking** — click "AI Rank" to analyze articles with DeepSeek and surface the most relevant news
- **Topic Emojis** — DeepSeek suggests a visual emoji for each article based on its content
- **Relevance Scores** — articles scored 0-100; high-relevance articles get a 🔥 badge
- **13+ sources** — OpenAI, Google AI, Anthropic, Meta AI, Microsoft Research, Hugging Face, NVIDIA, DeepMind, arXiv, MIT Tech Review, TechCrunch, The Verge, Wired
- **Auto-refresh** — backend scrapes every 15 minutes; frontend refreshes when tab is visible
- **Manual refresh** — "Refresh" button with animated spinner
- **Source filtering** — left sidebar with color-coded dots and article counts
- **Deduplication** — articles stored by unique URL; duplicates skipped
- **Direct links** — every card links to the original source

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Lucide React icons
- **Backend:** Python 3.11, FastAPI, Uvicorn
- **AI Analysis:** DeepSeek API (`deepseek-chat` model)
- **Database:** SQLite
- **Scraping:** feedparser
- **Scheduler:** APScheduler (background)
- **Deployment:** Docker + Docker Compose

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app + scheduler
│   ├── scraper.py           # RSS scraping logic
│   ├── deepseek.py          # DeepSeek AI analysis
│   ├── database.py          # SQLite operations
│   ├── models.py            # Pydantic schemas
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── NewsGrid.tsx
│   │   │   └── NewsCard.tsx
│   │   └── lib/
│   │       ├── api.ts       # API client
│   │       └── theme.tsx    # Theme context
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites

- Docker & Docker Compose

### Run with Docker Compose

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000) for the UI and [http://localhost:8000/docs](http://localhost:8000/docs) for the API docs.

The backend will perform an initial scrape on startup and then continue every 15 minutes.

### Run Locally (Development)

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -c "from database import init_db; init_db()"
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
API_PROXY_URL=http://localhost:8000 npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news?sort_by=published\|relevance` | List articles (filter by `?source=`, sort by published or relevance) |
| GET | `/api/sources` | List active sources with article counts |
| POST | `/api/refresh` | Trigger manual scrape |
| POST | `/api/analyze` | Run DeepSeek AI analysis on unanalyzed articles |
| GET | `/api/stats` | Aggregated stats |
| GET | `/health` | Health check |

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `./data/news.db` | SQLite database file path |
| `REFRESH_INTERVAL_MINUTES` | `15` | Scraping interval |
| `DEEPSEEK_API_KEY` | *(provided in docker-compose)* | DeepSeek API key for relevance scoring |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PROXY_URL` | `http://localhost:8000` | Backend URL for API proxy |
| `NEXT_PUBLIC_API_URL` | `` (empty) | Public API base URL (unused in Docker setup) |

## Notes

- **RSS feeds** are fetched directly with a 2-second delay between sources to respect rate limits.
- **X/Twitter scraping** is not included because public Nitter instances are unreliable and X requires authentication.
- **DeepSeek analysis** is triggered manually via the "AI Rank" button or can be automated by extending the scheduler in `main.py`. Only the 20 most recent unanalyzed articles are processed per run to control API costs.
- Articles are **never rewritten or summarized** — headlines and descriptions are stored exactly as published. DeepSeek only assigns a relevance score and topic emoji.
