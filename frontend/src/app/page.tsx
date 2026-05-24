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
  fetchVideoChannels,
  fetchSources,
  refreshNews,
  refreshVideos,
  analyzeNews,
  createProgressStream,
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
  const [videoChannels, setVideoChannels] = useState<SourceInfo[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [totalArticles, setTotalArticles] = useState(0);
  const [sortBy, setSortBy] = useState<'published' | 'relevance'>('published');
  const [activeTab, setActiveTab] = useState<'articles' | 'videos'>('articles');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadArticles = useCallback(async () => {
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
    }
  }, [selectedSource, sortBy]);

  const loadVideos = useCallback(async () => {
    try {
      const [videosData, channelsData] = await Promise.all([
        fetchVideos(selectedSource || undefined),
        fetchVideoChannels(),
      ]);
      setVideos(videosData);
      setVideoChannels(channelsData);
    } catch (err) {
      console.error('Error loading videos:', err);
    }
  }, [selectedSource]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    if (activeTab === 'articles') {
      await loadArticles();
    } else {
      await loadVideos();
    }
    setIsLoading(false);
  }, [activeTab, loadArticles, loadVideos]);

  const startProgressStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setShowModal(true);
    eventSourceRef.current = createProgressStream(
      (state) => {
        setProgress(state);
        if (state.status === 'done') {
          setTimeout(() => {
            loadData();
            setShowModal(false);
          }, 2000);
        }
      },
      () => {
        console.log('SSE error, falling back to polling');
      }
    );
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (activeTab === 'videos') {
        await refreshVideos();
      } else {
        await refreshNews();
      }
      startProgressStream();
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, activeTab, startProgressStream]);

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

  const currentSources = activeTab === 'articles' ? sources : videoChannels;

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
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsLoading(true);
          setSelectedSource(null);
        }}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          sources={currentSources}
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
          {activeTab === 'articles' ? (
            <NewsGrid articles={articles} isLoading={isLoading} />
          ) : (
            <VideoGrid videos={videos} isLoading={isLoading} />
          )}
        </main>
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
