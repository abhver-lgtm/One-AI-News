# AI News Aggregator

A full-stack AI news aggregator that collects articles from top AI research labs, companies, and tech journalism sources. Features a dark/light theme, DeepSeek AI-powered relevance ranking, real-time progress streaming during scrapes, Google AdSense integration, and a clean card-based UI.

## Features

- **Dark & Light Themes** — toggle instantly; preference saved in localStorage
- **JetBrains Mono font** — code-like monospace typography for readability
- **Real-time Progress Streaming** — live backend log console with progress bar during refresh & AI analysis
- **DeepSeek AI Ranking** — click "AI Rank" to analyze articles and surface the most relevant news
- **Topic Emojis** — DeepSeek suggests a visual emoji for each article
- **Relevance Scores** — articles scored 0-100; high-relevance articles get a 🔥 badge
- **13+ sources** — OpenAI, Google AI, Anthropic, Meta AI, Microsoft Research, Hugging Face, NVIDIA, DeepMind, arXiv, MIT Tech Review, TechCrunch, The Verge, Wired
- **Auto-refresh** — backend scrapes every 15 minutes; frontend refreshes when tab is visible
- **Google AdSense** — dedicated 300px ad column on the right (replace placeholder with your ID)
- **Responsive** — sidebar and ad column hide on smaller screens

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Lucide React
- **Backend:** Python 3.11, FastAPI, Uvicorn, Server-Sent Events (SSE)
- **AI Analysis:** DeepSeek API (`deepseek-chat` model)
- **Database:** SQLite
- **Scraping:** feedparser
- **Scheduler:** APScheduler (background)
- **Deployment:** Docker + Docker Compose, Render, Fly.io

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app + SSE progress streaming
│   ├── scraper.py           # RSS scraping with progress reporting
│   ├── deepseek.py          # DeepSeek AI analysis
│   ├── progress.py          # Real-time progress state manager
│   ├── database.py          # SQLite operations
│   ├── models.py            # Pydantic schemas
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx   # AdSense script injection
│   │   │   ├── page.tsx     # 3-column layout
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── NewsGrid.tsx
│   │   │   ├── NewsCard.tsx
│   │   │   ├── RefreshModal.tsx   # Live progress overlay
│   │   │   └── AdColumn.tsx       # Google AdSense column
│   │   └── lib/
│   │       ├── api.ts       # API client + SSE handler
│   │       └── theme.tsx
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml
├── render.yaml              # Render.com Blueprint
├── fly.toml                 # Fly.io config
└── README.md
```

## Local Development

### With Docker (Recommended)

```bash
docker compose up --build
```

- UI: http://localhost:3000
- API Docs: http://localhost:8000/docs

### Without Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -c "from database import init_db; init_db()"
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
API_PROXY_URL=http://localhost:8000 npm run dev
```

## Deploy to Production

### Option 1: Render.com (Easiest)

1. Push code to GitHub
2. Go to https://dashboard.render.com/blueprints
3. Click **"New Blueprint Instance"**
4. Connect your GitHub repo
5. Render reads `render.yaml` and creates both services automatically
6. Add environment variables in the Render dashboard:
   - `DEEPSEEK_API_KEY` = your DeepSeek API key
   - `CORS_ORIGINS` = your frontend URL

### Option 2: Fly.io

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/

# Launch backend
fly launch --config fly.toml

# Create persistent volume for SQLite
fly volumes create news_data --size 1 --region iad

# Set secrets
fly secrets set DEEPSEEK_API_KEY=your_key_here

# Deploy
fly deploy
```

### Option 3: VPS / Any Docker Host

```bash
git clone https://github.com/abhver-lgtm/One-AI-News.git
cd One-AI-News
docker compose -f docker-compose.yml up -d
```

## Set Up Google AdSense

1. Sign up at https://www.google.com/adsense/start/
2. Get your **Publisher ID** (looks like `ca-pub-1234567890123456`)
3. In `frontend/src/app/layout.tsx`, replace:
   ```
   ca-pub-XXXXXXXXXXXXXXXX
   ```
   with your actual Publisher ID.
4. In `frontend/src/components/AdColumn.tsx`, replace the `data-ad-client` and `data-ad-slot` values with your actual ad unit IDs.
5. Deploy and submit your site to Google for approval.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news?sort_by=published\|relevance` | List articles |
| GET | `/api/sources` | List active sources |
| POST | `/api/refresh` | Trigger manual scrape (background) |
| POST | `/api/analyze` | Trigger DeepSeek analysis (background) |
| GET | `/api/progress` | Current progress state |
| GET | `/api/progress/stream` | **SSE** live progress stream |
| GET | `/api/stats` | Aggregated stats |
| GET | `/health` | Health check |

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `./data/news.db` | SQLite file path |
| `REFRESH_INTERVAL_MINUTES` | `15` | Scraping interval |
| `DEEPSEEK_API_KEY` | — | DeepSeek API key |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PROXY_URL` | `http://localhost:8000` | Backend URL for API proxy |

## Notes

- **RSS feeds** are fetched directly with a 2-second delay between sources.
- **X/Twitter scraping** is not included due to authentication requirements.
- **DeepSeek analysis** processes max 20 unanalyzed articles per run to control API costs.
- Articles are **never rewritten** — only scored and emoji-tagged by AI.
- The progress stream uses **Server-Sent Events (SSE)** for real-time backend log visibility.
