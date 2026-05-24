'use client';

import { Article } from '@/lib/api';
import { ExternalLink, Clock } from 'lucide-react';

interface NewsCardProps {
  article: Article;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function NewsCard({ article }: NewsCardProps) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '22px',
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-hover)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* Top row: emoji + source badge + time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            fontSize: '22px',
            lineHeight: 1,
            flexShrink: 0,
          }}
          title="Topic suggested by DeepSeek AI"
        >
          {article.topic_emoji}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          {article.source_name}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontWeight: 500,
            marginLeft: 'auto',
          }}
        >
          <Clock size={12} />
          {timeAgo(article.published_at)}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: '17px',
          fontWeight: 700,
          lineHeight: 1.4,
          color: 'var(--text-primary)',
          marginBottom: '12px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          letterSpacing: '-0.2px',
        }}
      >
        {article.title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: '14px',
        }}
      >
        {article.description}
      </p>

      {/* Footer: relevance score + external link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border)',
          paddingTop: '12px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: article.relevance_score >= 80 ? 'var(--accent)' : 'var(--text-muted)',
            backgroundColor: article.relevance_score >= 80 ? 'var(--accent-soft)' : 'transparent',
            padding: article.relevance_score >= 80 ? '2px 8px' : '2px 0',
            borderRadius: '4px',
          }}
          title="Relevance score by DeepSeek AI"
        >
          {article.relevance_score >= 80 ? '🔥 HIGH RELEVANCE' : `SCORE ${Math.round(article.relevance_score)}`}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--accent)',
          }}
        >
          Read
          <ExternalLink size={12} />
        </span>
      </div>
    </a>
  );
}
