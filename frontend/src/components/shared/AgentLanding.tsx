'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AnalyticsSummary, Team, Engineer, TrendPoint } from '@/lib/types';

/* ── shared data hook ─────────────────────────────────────── */

export interface LandingData {
  analytics: AnalyticsSummary | null;
  teams:     Team[];
  roster:    Record<string, Engineer[]>; // teamId → engineers
  trends:    TrendPoint[];
  loading:   boolean;
}

export function useLandingData(loadRoster = false): LandingData {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [teams,     setTeams]     = useState<Team[]>([]);
  const [roster,    setRoster]    = useState<Record<string, Engineer[]>>({});
  const [trends,    setTrends]    = useState<TrendPoint[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [a, t, tr] = await Promise.all([
          api.analytics.summary(),
          api.teams.list(),
          api.analytics.trends(30),
        ]);
        if (cancelled) return;
        setAnalytics(a);
        setTeams(t);
        setTrends(tr);
        if (loadRoster && t.length > 0) {
          const slice = t.slice(0, 8);
          const results = await Promise.all(
            slice.map(team => api.teams.engineers(team.team_id).catch(() => [] as Engineer[]))
          );
          if (!cancelled) {
            const map: Record<string, Engineer[]> = {};
            slice.forEach((team, i) => { map[team.team_id] = results[i]; });
            setRoster(map);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [loadRoster]);

  return { analytics, teams, roster, trends, loading };
}

/* ── KPI tile ────────────────────────────────────────────── */

interface KpiTileProps {
  label: string;
  value: string | number;
  sub?:  string;
  color?: string;
  bg?:   string;
}

export function KpiTile({ label, value, sub, color = '#0A0A0A', bg = '#F9FAFB' }: KpiTileProps) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '14px 16px', flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/* ── Horizontal bar ──────────────────────────────────────── */

interface HBarProps {
  label:   string;
  value:   number;
  max:     number;
  color:   string;
  suffix?: string;
}

export function HBar({ label, value, max, color, suffix = '' }: HBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

/* ── Availability dot ────────────────────────────────────── */

export function AvailDot({ status }: { status: string }) {
  const color = status === 'Available' ? '#10B981' : status === 'Busy' ? '#F59E0B' : '#9CA3AF';
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />;
}

/* ── Section header ──────────────────────────────────────── */

export function LandingSectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      {icon}
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0A0A0A' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Loading skeleton ────────────────────────────────────── */

export function LandingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, flex: 1, borderRadius: 10 }} />)}
      </div>
      <div className="skeleton" style={{ height: 180, borderRadius: 10 }} />
      <div className="skeleton" style={{ height: 140, borderRadius: 10 }} />
    </div>
  );
}
