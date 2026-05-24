'use client';

import { RefreshCw, Moon, Sun, Sparkles, Newspaper, Clapperboard } from 'lucide-react';
import { useTheme } from '@/lib/theme';

interface HeaderProps {
  onRefresh: () => void;
  onAnalyze: () => void;
  isRefreshing: boolean;
  isAnalyzing: boolean;
  totalArticles: number;
  sortBy: 'published' | 'relevance';
  onSortChange: (sort: 'published' | 'relevance') => void;
  activeTab: 'articles' | 'videos';
  onTabChange: (tab: 'articles' | 'videos') => void;
}

export default function Header({
  onRefresh,
  onAnalyze,
  isRefreshing,
  isAnalyzing,
  totalArticles,
  sortBy,
  onSortChange,
  activeTab,
  onTabChange,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '68px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--accent-text)',
          }}
        >
          <Newspaper size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}
          >
            AI News Aggregator
          </h1>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              fontWeight: 500,
            }}
          >
            {totalArticles} articles indexed
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Tab toggle: Articles | Videos */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            padding: '3px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <button
            onClick={() => onTabChange('articles')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'articles' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'articles' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              boxShadow: activeTab === 'articles' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Newspaper size={12} />
            Articles
          </button>
          <button
            onClick={() => onTabChange('videos')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'videos' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'videos' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              boxShadow: activeTab === 'videos' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Clapperboard size={12} />
            Videos
          </button>
        </div>

        {activeTab === 'articles' && (
          <>
            {/* Sort toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                padding: '3px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <button
                onClick={() => onSortChange('published')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: sortBy === 'published' ? 'var(--bg-secondary)' : 'transparent',
                  color: sortBy === 'published' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  boxShadow: sortBy === 'published' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                Latest
              </button>
              <button
                onClick={() => onSortChange('relevance')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: sortBy === 'relevance' ? 'var(--bg-secondary)' : 'transparent',
                  color: sortBy === 'relevance' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  boxShadow: sortBy === 'relevance' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                Relevance
              </button>
            </div>

            {/* Analyze button */}
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              title="Analyze articles with DeepSeek AI"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-secondary)',
                color: isAnalyzing ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              <Sparkles size={14} style={{ opacity: isAnalyzing ? 0.5 : 1 }} />
              {isAnalyzing ? 'Analyzing...' : 'AI Rank'}
            </button>
          </>
        )}

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-secondary)',
            color: isRefreshing ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw
            size={14}
            style={{
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
            }}
          />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </header>
  );
}
