const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface Article {
  id: number;
  title: string;
  description: string;
  url: string;
  source: string;
  source_name: string;
  published_at: string;
  created_at: string;
  relevance_score: number;
  topic_emoji: string;
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

export async function fetchNews(source?: string, sortBy: 'published' | 'relevance' = 'published'): Promise<Article[]> {
  const url = new URL(`${API_BASE}/api/news`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  if (source) url.searchParams.set('source', source);
  url.searchParams.set('sort_by', sortBy);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch news');
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
