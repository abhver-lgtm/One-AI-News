'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import NewsGrid from '@/components/NewsGrid';
import RefreshModal from '@/components/RefreshModal';
import {
  fetchNews,
  fetchVideos,
  fetchSources,
  refreshNews,
  analyzeNews,
  createProgressStream,
  fetchProgress,
  Article,
  Video,
  SourceInfo,
  ProgressState,
} from '@/lib/api';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
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

  const loadArticles = useCallback(async () => {
    setIsLoadingArticles(true);
    try {
      const [newsData, sourcesData] = await Promise.all([
        fetchNews(selectedSource || undefined, sortBy),
        fetchSources(),
      ]);
      setArticles(newsData);
      setSources(sourcesData);
      setTotalArticles(sourcesData.reduce((sum, s) => sum + s.article_count, 0));
    } catch (err) {
      console.error('Error loading articles:', err);
    } finally {
      setIsLoadingArticles(false);
    }
  }, [selectedSource, sortBy]);

  const loadVideos = useCallback(async () => {
    setIsLoadingVideos(true);
    try {
      const videoData = await fetchVideos();
      setVideos(videoData);
    } catch (err) {
      console.error('Error loading videos:', err);
    } finally {
      setIsLoadingVideos(false);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    await Promise.all([loadArticles(), loadVideos()]);
  }, [loadArticles, loadVideos]);

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
          loadAllData();
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
                loadAllData();
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
  }, [clearProgressPolling, loadAllData, showToast]);

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
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAllData();
      }
    }, REFRESH_INTERVAL_MS);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      clearProgressPolling();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [loadAllData, clearProgressPolling]);

  const regularVideos = videos.filter((v) => !v.is_short).slice(0, 8);
  const shorts = videos.filter((v) => v.is_short).slice(0, 8);

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
          setIsLoadingArticles(true);
        }}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          sources={sources}
          selectedSource={selectedSource}
          onSelectSource={(s) => {
            setSelectedSource(s);
            setIsLoadingArticles(true);
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
          {/* Videos strip - no heading, seamless */}
          {videos.length > 0 && (
            <div
              style={{
                padding: '16px 24px 8px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  overflowX: 'auto',
                  paddingBottom: '6px',
                }}
              >
                {/* Shorts first - taller cards */}
                {shorts.map((video) => (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${video.channel_name}: ${video.title}`}
                    style={{
                      flex: '0 0 140px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'transform 0.15s, box-shadow 0.2s',
                      boxShadow: 'var(--shadow-sm)',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  >
                    <div style={{ position: 'relative', paddingTop: '177%', backgroundColor: 'var(--bg-tertiary)' }}>
                      {video.thumbnail_url && (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(0,0,0,0.15)',
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>▶</span>
                      </div>
                      <span
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Short
                      </span>
                    </div>
                  </a>
                ))}

                {/* Regular videos - landscape cards */}
                {regularVideos.map((video) => (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${video.channel_name}: ${video.title}`}
                    style={{
                      flex: '0 0 240px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'transform 0.15s, box-shadow 0.2s',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  >
                    <div style={{ position: 'relative', paddingTop: '56.25%', backgroundColor: 'var(--bg-tertiary)' }}>
                      {video.thumbnail_url && (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(0,0,0,0.15)',
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ color: '#fff', fontSize: '14px' }}>▶</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <p
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {video.title}
                      </p>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {video.channel_name}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Articles grid - no heading */}
          <NewsGrid articles={articles} isLoading={isLoadingArticles} />
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
