'use client';

import { Video } from '@/lib/api';
import VideoCard from './VideoCard';

interface VideoGridProps {
  videos: Video[];
  isLoading: boolean;
}

export default function VideoGrid({ videos, isLoading }: VideoGridProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '18px',
          padding: '24px',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              animation: 'pulse 1.5s ease-in-out infinite',
              opacity: 0.5,
            }}
          >
            <div style={{ paddingTop: '56.25%', backgroundColor: 'var(--bg-tertiary)' }} />
            <div style={{ padding: '16px', height: '100px' }} />
          </div>
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

  if (videos.length === 0) {
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
        <span style={{ fontSize: '32px' }}>🎬</span>
        No videos found. Click Refresh to fetch YouTube videos.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '18px',
        padding: '24px',
        alignContent: 'start',
      }}
    >
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
