'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import NewsGrid from '@/components/NewsGrid';
import RefreshModal from '@/components/RefreshModal';
import AdColumn from '@/components/AdColumn';
import { fetchNews, fetchSources, refreshNews, analyzeNews, createProgressStream, Article, SourceInfo, ProgressState } from '@/lib/api';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [totalArticles, setTotalArticles] = useState(0);
  const [sortBy, setSortBy] = useState<'published' | 'relevance'>('published');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
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

  const startProgressStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setShowModal(true);
    eventSourceRef.current = createProgressStream(
      (state) => {
        setProgress(state);
        if (state.status === 'done') {
          // Give user a moment to see "done" before auto-closing
          setTimeout(() => {
            loadData();
            setShowModal(false);
          }, 2000);
        }
      },
      () => {
        // on error, fall back to polling
        console.log('SSE error, falling back to polling');
      }
    );
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshNews();
      startProgressStream();
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, startProgressStream]);

  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      await analyzeNews();
      startProgressStream();
    } catch (err) {
      console.error('Error analyzing:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, startProgressStream]);

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
      if (eventSourceRef.current) eventSourceRef.current.close();
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
            minWidth: 0,
          }}
        >
          <NewsGrid articles={articles} isLoading={isLoading} />
        </main>
        <AdColumn />
      </div>

      {showModal && (
        <RefreshModal
          progress={progress}
          onClose={() => {
            setShowModal(false);
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
          }}
        />
      )}
    </div>
  );
}
