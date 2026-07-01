'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell, Zap } from 'lucide-react';
import Link from 'next/link';

const LABELS: Record<string, string> = {
  '/':                      'Dashboard',
  '/tickets':               'Tickets',
  '/incident-pipeline':     'Pipeline',
  '/auto-triage':           'Auto-Triage',
  '/incident-intelligence': 'Intelligence',
  '/irr-agent':             'IRR Agent',
  '/human-resolver':        'Resolver',
  '/dq-agent':              'DQ Agent',
  '/analytics':             'Analytics',
  '/settings':              'Settings',
};

export function Topbar() {
  const pathname = usePathname();
  const label = Object.entries(LABELS).find(([key]) =>
    key === '/' ? pathname === '/' : pathname.startsWith(key)
  )?.[1] ?? 'Vital-Ops';

  return (
    <header style={{
      height: 72,
      background: '#F41C5E',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      gap: 24,
      boxShadow: '0 2px 16px rgba(244,28,94,0.18)',
    }}>
      {/* Left: page label */}
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', flexShrink: 0, minWidth: 100 }}>
        {label}
      </div>

      {/* Center: search */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 520, maxWidth: '100%' }}>
          <Search size={15} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            placeholder="Search incidents, tickets, agents..."
            style={{
              width: '100%',
              paddingLeft: 40,
              paddingRight: 52,
              paddingTop: 10,
              paddingBottom: 10,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize: 13,
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => {
              e.target.style.background = 'rgba(255,255,255,0.22)';
              e.target.style.borderColor = 'rgba(255,255,255,0.45)';
              e.target.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.12)';
            }}
            onBlur={e => {
              e.target.style.background = 'rgba(255,255,255,0.15)';
              e.target.style.borderColor = 'rgba(255,255,255,0.25)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <kbd style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, color: 'rgba(255,255,255,0.55)',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 5, padding: '2px 6px', fontFamily: 'var(--font-mono)',
          }}>⌘K</kbd>
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Live */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: '#fff',
          background: 'rgba(255,255,255,0.15)',
          padding: '6px 14px', borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.25)',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', boxShadow: '0 0 6px rgba(74,222,128,0.8)' }} />
          Live
        </div>

        {/* Run Pipeline */}
        <Link href="/incident-pipeline" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 700, color: '#F41C5E',
          background: '#fff', padding: '7px 16px',
          borderRadius: 20, textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          <Zap size={12} fill="#F41C5E" />
          Run Pipeline
        </Link>

        {/* Bell */}
        <button style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 10, padding: '7px 8px',
          cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center',
          transition: 'background 0.15s',
        }}>
          <Bell size={16} />
        </button>

        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          border: '2px solid rgba(255,255,255,0.4)',
          color: '#fff', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
          cursor: 'pointer',
        }}>
          VO
        </div>
      </div>
    </header>
  );
}
