# AI News Aggregator

A full-stack AI news aggregator that collects articles and YouTube videos from top AI research labs, companies, tech journalism sources, and AI YouTubers. Features a dark/light theme, DeepSeek AI-powered relevance ranking, real-time progress streaming, and a clean card-based UI.

## Features

- **Articles + Videos** — toggle between RSS news feeds and YouTube videos from top AI creators
- **Dark & Light Themes** — toggle instantly; preference saved in localStorage
- **JetBrains Mono font** — code-like monospace typography for readability
- **Real-time Progress Streaming** — live backend log console with progress bar during refresh & AI analysis
- **DeepSeek AI Ranking** — click "AI Rank" to analyze articles and surface the most relevant news
- **Topic Emojis** — DeepSeek suggests a visual emoji for each article
- **Relevance Scores** — articles scored 0-100; high-relevance articles get a 🔥 badge
- **13+ news sources** — OpenAI, Google AI, Anthropic, Meta AI, Microsoft Research, Hugging Face, NVIDIA, DeepMind, arXiv, MIT Tech Review, TechCrunch, The Verge, Wired
- **11+ YouTube channels** — Two Minute Papers, Matt Wolfe, AI Explained, Yannic Kilcher, Matthew Berman, MattVidPro, Fireship, Sentdex, Lex Fridman, ColdFusion, Siraj Raval
- **Auto-refresh** — backend scrapes every 15 minutes; frontend refreshes when tab is visible
- **Responsive** — sidebar hides on mobile

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Lucide React
- **Backend:** Python 3.11, FastAPI, Uvicorn, Server-Sent Events (SSE)
- **AI Analysis:** DeepSeek API (`deepseek-chat` model)
- **Database:** SQLite
- **Scraping:** feedparser (RSS + YouTube RSS)
- **Scheduler:** APScheduler (background)
- **Deployment:** Docker + Docker Compose, Render, Fly.io

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app + SSE progress streaming
│   ├── scraper.py           # RSS scraping with progress reporting
│   ├── youtube_scraper.py   # YouTube RSS scraping
│   ├── deepseek.py          # DeepSeek AI analysis
│   ├── progress.py          # Real-time progress state manager
│   ├── database.py          # SQLite operations
│   ├── models.py            # Pydantic schemas
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx     # Articles + Videos tabs
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── NewsGrid.tsx
│   │   │   ├── NewsCard.tsx
│   │   │   ├── VideoGrid.tsx
│   │   │   ├── VideoCard.tsx
│   │   │   └── RefreshModal.tsx
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

---

## How to Publish Your Website

You have **3 great options** to make this app publicly accessible:

---

### Option 1: Render.com (Recommended — Easiest)

Render has a generous free tier and supports Docker natively.

**Step 1:** Push your code to GitHub (already done)

**Step 2:** Go to https://dashboard.render.com/blueprints

**Step 3:** Click **"New Blueprint Instance"**

**Step 4:** Connect your GitHub repo `abhver-lgtm/One-AI-News`

**Step 5:** Render reads `render.yaml` and automatically creates:
- `ai-news-backend` (Docker service with persistent disk)
- `ai-news-frontend` (Docker service)

**Step 6:** Add environment variables in the Render dashboard:
- `DEEPSEEK_API_KEY` = your DeepSeek API key
- `CORS_ORIGINS` = your frontend URL (e.g., `https://ai-news-frontend.onrender.com`)

**Step 7:** Wait for deploy (~5 minutes) and visit the frontend URL

**Cost:** Free tier available. Paid plans start at $7/month.

---

### Option 2: Fly.io (Best Performance)

Fly.io runs your app close to users with edge deployment.

**Step 1:** Install flyctl
```bash
curl -L https://fly.io/install.sh | sh
```

**Step 2:** Login and launch
```bash
fly auth login
fly launch --config fly.toml
```

**Step 3:** Create persistent volume for SQLite
```bash
fly volumes create news_data --size 1 --region iad
```

**Step 4:** Set secrets
```bash
fly secrets set DEEPSEEK_API_KEY=your_key_here
fly secrets set CORS_ORIGINS=https://yourdomain.com
```

**Step 5:** Deploy
```bash
fly deploy
```

**Step 6:** (Optional) Add a custom domain
```bash
fly certs add yourdomain.com
```

**Cost:** Free tier: 3 shared-cpu-1 256mb VMs. Paid: ~$2-5/month for this app.

---

### Option 3: VPS / Any Cloud Server (Full Control)

If you have a server (DigitalOcean, Linode, AWS EC2, Hetzner, etc.):

**Step 1:** SSH into your server and install Docker

**Step 2:** Clone your repo
```bash
git clone https://github.com/abhver-lgtm/One-AI-News.git
cd One-AI-News
```

**Step 3:** Create a `.env` file
```bash
cat > .env << EOF
DEEPSEEK_API_KEY=your_key_here
CORS_ORIGINS=https://yourdomain.com
REFRESH_INTERVAL_MINUTES=15
EOF
```

**Step 4:** Run with Docker Compose
```bash
docker compose up -d --build
```

**Step 5:** Set up a reverse proxy (nginx or Caddy) with SSL

**Example Caddyfile:**
```
yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:8000
}
```

**Step 6:** Install Caddy and run
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
sudo caddy start
```

**Cost:** ~$5-10/month for a small VPS.

---

### Option 4: Railway (Alternative)

1. Go to https://railway.app/
2. New Project → Deploy from GitHub repo
3. Add a persistent volume for SQLite
4. Set environment variables
5. Deploy

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news?sort_by=published\|relevance` | List articles |
| GET | `/api/videos` | List YouTube videos |
| GET | `/api/sources` | List article sources |
| GET | `/api/video-channels` | List YouTube channels |
| POST | `/api/refresh` | Trigger article scrape |
| POST | `/api/refresh/videos` | Trigger YouTube scrape |
| POST | `/api/analyze` | Trigger DeepSeek analysis |
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
- **YouTube videos** are fetched via public RSS feeds (no API key needed).
- **X/Twitter scraping** is not included due to authentication requirements.
- **DeepSeek analysis** processes max 20 unanalyzed articles per run to control API costs.
- Articles are **never rewritten** — only scored and emoji-tagged by AI.
- The progress stream uses **Server-Sent Events (SSE)** for real-time backend log visibility.
