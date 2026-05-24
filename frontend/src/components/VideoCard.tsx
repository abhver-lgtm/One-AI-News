'use client';

import { Video } from '@/lib/api';
import { Play, Clock, ExternalLink } from 'lucide-react';

interface VideoCardProps {
  video: Video;
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

export default function VideoCard({ video }: VideoCardProps) {
  const videoId = video.url.includes('v=') ? video.url.split('v=')[1]?.split('&')[0] : null;
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: 'var(--shadow-sm)',
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
      {/* Thumbnail */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%', // 16:9
          backgroundColor: 'var(--bg-tertiary)',
          overflow: 'hidden',
        }}
      >
        {video.thumbnail_url ? (
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
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play size={22} fill="white" color="white" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border)',
            }}
          >
            {video.channel_name}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontWeight: 500,
            }}
          >
            <Clock size={11} />
            {timeAgo(video.published_at)}
          </span>
        </div>

        <h3
          style={{
            fontSize: '15px',
            fontWeight: 700,
            lineHeight: 1.4,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {video.title}
        </h3>

        <p
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {video.description}
        </p>
      </div>
    </a>
  );
}
