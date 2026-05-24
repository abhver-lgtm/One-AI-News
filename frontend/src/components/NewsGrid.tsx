'use client';

import { FeedItem } from '@/lib/api';
import NewsCard from './NewsCard';
import VideoCard from './VideoCard';

interface NewsGridProps {
  items: FeedItem[];
  isLoading: boolean;
}

export default function NewsGrid({ items, isLoading }: NewsGridProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '18px',
          padding: '24px',
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '22px',
              height: '220px',
              animation: 'pulse 1.5s ease-in-out infinite',
              opacity: 0.5,
            }}
          />
        ))}
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-muted)',
          fontSize: '15px',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '32px' }}>📭</span>
        No items found.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '18px',
        padding: '24px',
        alignContent: 'start',
      }}
    >
      {items.map((item) =>
        item.type === 'video' ? (
          <VideoCard key={item.id} item={item} />
        ) : (
          <NewsCard key={item.id} item={item} />
        )
      )}
    </div>
  );
}
