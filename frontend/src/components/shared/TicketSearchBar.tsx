'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onLoad: (id: string) => void;
  loading?: boolean;
  action?: React.ReactNode;
}

export function TicketSearchBar({ value, onChange, onLoad, loading, action }: Props) {
  return (
    <div className="card animate-fade-up" style={{ padding: '16px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <div style={{ flex: 1 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
          TICKET ID
        </label>
        <div style={{ position: 'relative' }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLoad(value)}
            placeholder="INC-001234 or LIVE-ABCD1234"
            style={{
              width: '100%', padding: '9px 12px 9px 32px',
              borderRadius: 10, border: '1px solid #EAECF0',
              fontSize: 13, fontFamily: 'var(--font-mono)',
              boxSizing: 'border-box', color: '#0A0A0A',
              transition: 'border-color 0.15s',
            }}
          />
        </div>
      </div>
      <button
        onClick={() => onLoad(value)}
        disabled={loading || !value.trim()}
        className="btn-secondary"
        style={{ whiteSpace: 'nowrap' }}
      >
        {loading ? 'Loading…' : 'Load'}
      </button>
      {action}
    </div>
  );
}
