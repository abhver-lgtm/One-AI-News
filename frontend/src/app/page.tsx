'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import NewsGrid from '@/components/NewsGrid';
import { fetchNews, fetchSources, refreshNews, analyzeNews, Article, SourceInfo } from '@/lib/api';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [totalArticles, setTotalArticles] = useState(0);
  const [sortBy, setSortBy] = useState<'published' | 'relevance'>('published');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [newsData, sourcesData] = await Promise.all([
        fetchNews(selectedSource || undefined, sortBy),
        fetchSources(),
      ]);
      setArticles(newsData);
      setSources(sourcesData);
      setTotalArticles(sourcesData.reduce((sum, s) => sum + s.article_count, 0));
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSource, sortBy]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshNews();
      await loadData();
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadData]);

  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeNews();
      console.log('Analyze result:', result);
      await loadData();
    } catch (err) {
      console.error('Error analyzing:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    }, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [handleRefresh]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <Header
        onRefresh={handleRefresh}
        onAnalyze={handleAnalyze}
        isRefreshing={isRefreshing}
        isAnalyzing={isAnalyzing}
        totalArticles={totalArticles}
        sortBy={sortBy}
        onSortChange={(s) => {
          setSortBy(s);
          setIsLoading(true);
        }}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          sources={sources}
          selectedSource={selectedSource}
          onSelectSource={(s) => {
            setSelectedSource(s);
            setIsLoading(true);
          }}
        />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <NewsGrid articles={articles} isLoading={isLoading} />
        </main>
      </div>
    </div>
  );
}
