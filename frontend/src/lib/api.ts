const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface FeedItem {
  id: number;
  type: 'article' | 'video';
  title: string;
  description: string;
  url: string;
  source_name: string;
  published_at: string;
  relevance_score: number;
  topic_emoji?: string;
  thumbnail_url?: string;
}

export interface SourceInfo {
  name: string;
  source: string;
  color: string;
  article_count: number;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  added: number;
  skipped: number;
}

export interface AnalyzeResponse {
  success: boolean;
  message: string;
  analyzed: number;
}

export interface ProgressState {
  status: 'idle' | 'scraping' | 'analyzing' | 'done';
  current_source: string | null;
  sources_total: number;
  sources_done: number;
  articles_found: number;
  articles_added: number;
  articles_skipped: number;
  analyze_done: number;
  analyze_total: number;
  logs: { time: string; message: string }[];
  started_at: string | null;
  finished_at: string | null;
}

export async function fetchFeed(
  source?: string,
  sortBy: 'published' | 'relevance' = 'relevance',
  limit: number = 200
): Promise<FeedItem[]> {
  const url = new URL(`${API_BASE}/api/feed`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  if (source) url.searchParams.set('source', source);
  url.searchParams.set('sort_by', sortBy);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch feed');
  return res.json();
}

export async function fetchSources(): Promise<SourceInfo[]> {
  const url = `${API_BASE}/api/sources`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch sources');
  return res.json();
}

export async function refreshNews(): Promise<RefreshResponse> {
  const url = `${API_BASE}/api/refresh`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh news');
  return res.json();
}

export async function analyzeNews(): Promise<AnalyzeResponse> {
  const url = `${API_BASE}/api/analyze`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to analyze news');
  return res.json();
}

export async function fetchProgress(): Promise<ProgressState> {
  const url = `${API_BASE}/api/progress`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch progress');
  return res.json();
}

export function createProgressStream(onProgress: (state: ProgressState) => void, onError?: () => void) {
  const url = `${API_BASE}/api/progress/stream`;
  const eventSource = new EventSource(url);
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onProgress(data);
    } catch {
      // ignore parse errors
    }
  };
  eventSource.onerror = () => {
    if (onError) onError();
    eventSource.close();
  };
  return eventSource;
}
