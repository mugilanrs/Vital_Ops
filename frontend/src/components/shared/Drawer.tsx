'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: React.ReactNode;
}

export function Drawer({ open, onClose, title, subtitle, width = 520, children }: DrawerProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,10,10,0.35)',
          backdropFilter: 'blur(2px)',
          zIndex: 100,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* Slide-over panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width,
        background: '#fff',
        boxShadow: '-12px 0 48px rgba(0,0,0,0.14)',
        zIndex: 101,
        transform: open ? 'translateX(0)' : `translateX(${width}px)`,
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.3 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB',
              borderRadius: 8, padding: '6px 7px',
              cursor: 'pointer', display: 'flex', color: '#6B7280',
              marginLeft: 12, flexShrink: 0,
              transition: 'background 0.12s',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          {children}
        </div>
      </div>
    </>
  );
}
