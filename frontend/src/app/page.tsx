'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import NewsGrid from '@/components/NewsGrid';
import RefreshModal from '@/components/RefreshModal';
import {
  fetchFeed,
  fetchSources,
  refreshNews,
  analyzeNews,
  createProgressStream,
  fetchProgress,
  FeedItem,
  SourceInfo,
  ProgressState,
} from '@/lib/api';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export default function Home() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [totalArticles, setTotalArticles] = useState(0);
  const [sortBy, setSortBy] = useState<'published' | 'relevance'>('relevance');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'info' | 'success' | 'error'} | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const [feedData, sourcesData] = await Promise.all([
        fetchFeed(selectedSource || undefined, sortBy),
        fetchSources(),
      ]);
      setFeedItems(feedData);
      setSources(sourcesData);
      setTotalArticles(sourcesData.reduce((sum, s) => sum + s.article_count, 0));
    } catch (err) {
      console.error('Error loading feed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSource, sortBy]);

  const clearProgressPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const startProgressPolling = useCallback((taskType: 'refresh' | 'analyze') => {
    clearProgressPolling();
    setShowModal(true);

    eventSourceRef.current = createProgressStream(
      (state) => {
        setProgress(state);
        if (state.status === 'done') {
          clearProgressPolling();
          loadFeed();
          if (taskType === 'analyze' && state.analyze_done > 0) {
            showToast(`AI ranking complete! ${state.analyze_done} articles scored.`, 'success');
          } else if (taskType === 'refresh') {
            const total = state.articles_added;
            showToast(total > 0 ? `Refresh complete! ${total} new items found.` : 'Refresh complete! Everything is up to date.', 'success');
          }
          setTimeout(() => setShowModal(false), 1500);
        }
      },
      () => {
        console.log('SSE failed, falling back to polling');
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(async () => {
            try {
              const state = await fetchProgress();
              setProgress(state);
              if (state.status === 'done') {
                clearProgressPolling();
                loadFeed();
                if (taskType === 'analyze' && state.analyze_done > 0) {
                  showToast(`AI ranking complete! ${state.analyze_done} articles scored.`, 'success');
                } else if (taskType === 'refresh') {
                  const total = state.articles_added;
                  showToast(total > 0 ? `Refresh complete! ${total} new items found.` : 'Refresh complete! Everything is up to date.', 'success');
                }
                setTimeout(() => setShowModal(false), 1500);
              }
            } catch {
              // ignore polling errors
            }
          }, 2000);
        }
      }
    );
  }, [clearProgressPolling, loadFeed, showToast]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await refreshNews();
      if (!result.success) {
        showToast(result.message || 'A refresh is already running', 'error');
        return;
      }
      showToast('Fetching latest articles & videos...', 'info');
      startProgressPolling('refresh');
    } catch (err) {
      console.error('Error refreshing:', err);
      showToast('Failed to start refresh', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, startProgressPolling, showToast]);

  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeNews();
      if (!result.success) {
        showToast(result.message || 'Analysis is already running', 'error');
        return;
      }
      showToast('Ranking articles with DeepSeek AI...', 'info');
      startProgressPolling('analyze');
    } catch (err) {
      console.error('Error analyzing:', err);
      showToast('Failed to start analysis', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, startProgressPolling, showToast]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadFeed();
      }
    }, REFRESH_INTERVAL_MS);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      clearProgressPolling();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [loadFeed, clearProgressPolling]);

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
          <NewsGrid items={feedItems} isLoading={isLoading} />
        </main>
      </div>

      {showModal && (
        <RefreshModal
          progress={progress}
          onClose={() => {
            setShowModal(false);
            clearProgressPolling();
          }}
        />
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: toast.type === 'error' ? '#fee2e2' : toast.type === 'success' ? '#dcfce7' : 'var(--bg-secondary)',
            color: toast.type === 'error' ? '#991b1b' : toast.type === 'success' ? '#166534' : 'var(--text-primary)',
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${toast.type === 'error' ? '#fecaca' : toast.type === 'success' ? '#bbf7d0' : 'var(--border)'}`,
            boxShadow: 'var(--shadow-md)',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 100,
            animation: 'fadeInUp 0.3s ease',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {toast.message}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
