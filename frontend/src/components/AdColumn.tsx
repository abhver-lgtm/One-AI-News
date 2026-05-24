'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function AdColumn() {
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        const slots = document.querySelectorAll('.adsbygoogle');
        slots.forEach(() => {
          window.adsbygoogle.push({});
        });
      }
    } catch {
      // AdSense not loaded yet (e.g., during development)
    }
  }, []);

  return (
    <aside
      data-ad-column
      style={{
        width: '300px',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        overflowY: 'auto',
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
          textAlign: 'center',
        }}
      >
        Sponsored
      </div>

      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <AdSlot slotId="ad-slot-1" />
        <AdSlot slotId="ad-slot-2" />
        <AdSlot slotId="ad-slot-3" />
      </div>
    </aside>
  );
}

function AdSlot({ slotId }: { slotId: string }) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '250px',
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px dashed var(--border-hover)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: 'var(--text-muted)',
        fontSize: '12px',
        fontWeight: 600,
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <span style={{ fontSize: '24px' }}>📢</span>
      <span>Advertisement</span>
      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>
        Google AdSense
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
