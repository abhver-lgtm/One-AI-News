'use client';

import { SourceInfo } from '@/lib/api';
import { Rss } from 'lucide-react';

interface SidebarProps {
  sources: SourceInfo[];
  selectedSource: string | null;
  onSelectSource: (source: string | null) => void;
}

export default function Sidebar({ sources, selectedSource, onSelectSource }: SidebarProps) {
  const totalCount = sources.reduce((sum, s) => sum + s.article_count, 0);

  return (
    <aside
      style={{
        width: '280px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: '20px 20px 12px',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Rss size={13} />
        Sources
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
        <SourceButton
          label="All Sources"
          count={totalCount}
          color="#888"
          isActive={selectedSource === null}
          onClick={() => onSelectSource(null)}
        />

        {sources.map((source) => (
          <SourceButton
            key={source.source}
            label={source.name}
            count={source.article_count}
            color={source.color}
            isActive={selectedSource === source.source}
            onClick={() => onSelectSource(source.source)}
          />
        ))}
      </nav>
    </aside>
  );
}

function SourceButton({
  label,
  count,
  color,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '9px 14px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
        color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '3px',
        transition: 'background 0.15s, color 0.15s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
        <span
          style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: color,
            display: 'inline-block',
            flexShrink: 0,
            boxShadow: `0 0 0 2px ${isActive ? 'var(--accent-soft)' : 'var(--bg-secondary)'}`,
          }}
        />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </span>
      <span
        style={{
          fontSize: '11px',
          color: isActive ? 'var(--accent-text)' : 'var(--text-muted)',
          fontWeight: 600,
          flexShrink: 0,
          marginLeft: '8px',
          opacity: 0.8,
        }}
      >
        {count}
      </span>
    </button>
  );
}
