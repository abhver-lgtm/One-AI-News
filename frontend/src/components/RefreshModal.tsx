'use client';

import { ProgressState } from '@/lib/api';
import { X, Loader2, CheckCircle2, Radio, Database, Sparkles } from 'lucide-react';

interface RefreshModalProps {
  progress: ProgressState | null;
  onClose: () => void;
}

export default function RefreshModal({ progress, onClose }: RefreshModalProps) {
  if (!progress || progress.status === 'idle') return null;

  const isDone = progress.status === 'done';
  const isAnalyzing = progress.status === 'analyzing';
  const isScraping = progress.status === 'scraping';

  const percent =
    progress.status === 'scraping' && progress.sources_total > 0
      ? Math.round((progress.sources_done / progress.sources_total) * 100)
      : progress.status === 'analyzing' && progress.analyze_total > 0
      ? Math.round((progress.analyze_done / progress.analyze_total) * 100)
      : isDone
      ? 100
      : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isDone ? (
              <CheckCircle2 size={20} color="var(--accent)" />
            ) : isAnalyzing ? (
              <Sparkles size={20} color="var(--accent)" className="spin-slow" />
            ) : (
              <Radio size={20} color="var(--accent)" />
            )}
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isDone ? 'All Done!' : isAnalyzing ? 'DeepSeek Analyzing...' : 'Scraping Feeds...'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '18px 22px 10px' }}>
          <div
            style={{
              height: '8px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percent}%`,
                backgroundColor: 'var(--accent)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              fontWeight: 600,
            }}
          >
            <span>{percent}%</span>
            <span>
              {isScraping
                ? `${progress.sources_done} / ${progress.sources_total} sources`
                : isAnalyzing
                ? `${progress.analyze_done} / ${progress.analyze_total} articles`
                : 'Complete'}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            padding: '0 22px 14px',
          }}
        >
          <StatBox icon={<Database size={14} />} label="Found" value={progress.articles_found} />
          <StatBox icon={<CheckCircle2 size={14} />} label="Added" value={progress.articles_added} />
          <StatBox icon={<X size={14} />} label="Skipped" value={progress.articles_skipped} />
        </div>

        {/* Live terminal */}
        <div
          style={{
            flex: 1,
            minHeight: '180px',
            maxHeight: '320px',
            backgroundColor: 'var(--bg-primary)',
            margin: '0 22px 22px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            padding: '14px',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
          }}
        >
          {progress.logs.length === 0 && (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              <Loader2 size={12} style={{ display: 'inline', marginRight: '6px', animation: 'spin 1s linear infinite' }} />
              Waiting for backend to start...
            </span>
          )}
          {progress.logs.map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                {new Date(log.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{log.message}</span>
            </div>
          ))}
          {!isDone && (
            <div style={{ marginTop: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '7px',
                  height: '14px',
                  backgroundColor: 'var(--accent)',
                  animation: 'blink 1s step-end infinite',
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}
