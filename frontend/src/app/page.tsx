'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import NewsGrid from '@/components/NewsGrid';
import VideoGrid from '@/components/VideoGrid';
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
  const [sortBy, setSortBy] = useState<'published' | 'relevance'>('published');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
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

  const startProgressPolling = useCallback(() => {
    clearProgressPolling();
    setShowModal(true);

    // SSE for real-time updates
    eventSourceRef.current = createProgressStream(
      (state) => {
        setProgress(state);
        if (state.status === 'done') {
          clearProgressPolling();
          loadAllData();
          setTimeout(() => setShowModal(false), 1500);
        }
      },
      () => {
        // SSE failed - fall back to polling
        console.log('SSE failed, falling back to polling');
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(async () => {
            try {
              const state = await fetchProgress();
              setProgress(state);
              if (state.status === 'done') {
                clearProgressPolling();
                loadAllData();
                setTimeout(() => setShowModal(false), 1500);
              }
            } catch {
              // ignore polling errors
            }
          }, 2000);
        }
      }
    );
  }, [clearProgressPolling, loadAllData]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await refreshNews();
      if (!result.success) {
        showToast(result.message || 'Refresh failed');
        return;
      }
      startProgressPolling();
    } catch (err) {
      console.error('Error refreshing:', err);
      showToast('Failed to start refresh');
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
        showToast(result.message || 'Analysis failed');
        return;
      }
      startProgressPolling();
    } catch (err) {
      console.error('Error analyzing:', err);
      showToast('Failed to start analysis');
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
    };
  }, [loadAllData, clearProgressPolling]);

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
          {/* Videos section */}
          <div style={{ padding: '20px 24px 8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '18px' }}>🎬</span>
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Latest AI Videos
              </h2>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'thin',
              }}
            >
              {isLoadingVideos
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: '0 0 280px',
                        height: '200px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        animation: 'pulse 1.5s ease-in-out infinite',
                        opacity: 0.4,
                      }}
                    />
                  ))
                : videos.slice(0, 12).map((video) => (
                    <a
                      key={video.id}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: '0 0 280px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
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
                            backgroundColor: 'rgba(0,0,0,0.2)',
                          }}
                        >
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(0,0,0,0.7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span style={{ color: 'white', fontSize: '16px' }}>▶</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <p
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {video.title}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {video.channel_name}
                        </p>
                      </div>
                    </a>
                  ))}
            </div>
          </div>

          {/* Articles section */}
          <div style={{ padding: '8px 24px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '18px' }}>📰</span>
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Latest Articles
              </h2>
            </div>
          </div>
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
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            padding: '12px 24px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 100,
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          {toast}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
