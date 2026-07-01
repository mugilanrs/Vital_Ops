'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowRight, GitBranch, Target, Brain, Lightbulb,
  ShieldCheck, TrendingUp, TrendingDown, Minus, Cpu,
} from 'lucide-react';
import { StatusChip } from '@/components/shared/StatusChip';
import { api } from '@/lib/api';
import { useSSE } from '@/hooks/useSSE';
import type { AnalyticsSummary, Incident } from '@/lib/types';

const EVENT_COLOR: Record<string, string> = {
  pipeline_started:       '#6366F1',
  triage_started:         '#F41C5E',
  triage_completed:       '#10B981',
  intelligence_started:   '#6366F1',
  intelligence_completed: '#10B981',
  irr_started:            '#8B5CF6',
  irr_completed:          '#10B981',
  human_review_pending:   '#F59E0B',
  dq_started:             '#10B981',
  dq_completed:           '#10B981',
  pipeline_complete:      '#10B981',
};

const AGENTS = [
  { name: 'Auto-Triage',   desc: 'Team & engineer ranking',     color: '#F41C5E', bg: '#FFF0F4', icon: Target,      href: '/auto-triage'           },
  { name: 'Intelligence',  desc: 'Similarity & correlates',     color: '#6366F1', bg: '#EEF2FF', icon: Brain,       href: '/incident-intelligence' },
  { name: 'IRR Agent',     desc: 'Groq LLM resolution synth',   color: '#8B5CF6', bg: '#F5F3FF', icon: Lightbulb,  href: '/irr-agent'             },
  { name: 'DQ Validator',  desc: 'Ticket quality assurance',    color: '#10B981', bg: '#ECFDF5', icon: ShieldCheck, href: '/dq-agent'              },
];

function KpiCard({
  value, label, sub, trend,
}: { value: string; label: string; sub?: string; trend?: 'up' | 'down' | 'flat' }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#9CA3AF';
  return (
    <div className="card" style={{ padding: '16px 20px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </div>
        {trend && <TrendIcon size={14} color={trendColor} />}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recent, setRecent] = useState<Incident[]>([]);
  const [liveEvents, setLiveEvents] = useState<{ type: string; data: Record<string, unknown>; ts: string }[]>([]);

  useSSE((type, data) => {
    setLiveEvents((prev) => [
      { type, data, ts: new Date().toLocaleTimeString() },
      ...prev.slice(0, 11),
    ]);
  });

  useEffect(() => {
    api.analytics.summary().then(setSummary).catch(console.error);
    api.incidents.list({ page_size: 8 }).then((r) => setRecent(r.items)).catch(console.error);
  }, []);

  const priorityColors: Record<string, string> = { Top: '#EF4444', High: '#F59E0B', Medium: '#3B82F6', Low: '#10B981' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero card ── */}
      <div style={{
        background: '#fff',
        borderRadius: 24,
        border: '1px solid #ECECEC',
        boxShadow: '0 2px 24px rgba(0,0,0,0.04)',
        padding: '32px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 32,
      }}>
        {/* Left */}
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#F41C5E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={11} color="#F41C5E" />
            AI Operations Center
          </div>
          <h1 style={{ margin: 0, fontSize: 42, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Vital-Ops Dashboard
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, color: '#64748B', lineHeight: 1.5 }}>
            Intelligent triage · correlation · AI resolution
          </p>
        </div>

        {/* Right: Live Status widget */}
        <div style={{
          flexShrink: 0,
          background: '#F8FAFC',
          border: '1px solid #E8ECF4',
          borderRadius: 18,
          padding: '16px 22px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          minWidth: 180,
        }}>
          {/* LIVE pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.7)', display: 'inline-block', animation: 'pulse-dot 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', letterSpacing: '0.1em' }}>LIVE</span>
          </div>

          {/* Animated waveform bars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 24 }}>
            {[0, 60, 120, 180, 240, 300, 360, 420, 480].map((delay, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 99,
                background: '#10B981',
                opacity: 0.75,
                animation: `waveBar 1.2s ease-in-out ${delay}ms infinite`,
              }} />
            ))}
          </div>

          {/* System Healthy */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', textAlign: 'center', lineHeight: 1.4 }}>
            System Healthy
          </div>
        </div>
      </div>


      {/* ── KPI Stats row ── */}
      <div style={{ display: 'flex', gap: 12 }}>
        <KpiCard
          value={summary ? summary.total_incidents.toLocaleString() : '—'}
          label="Total Incidents"
          trend="up"
        />
        <KpiCard
          value={summary ? summary.open_incidents.toLocaleString() : '—'}
          label="Open Now"
          sub="Active tickets"
          trend="down"
        />
        <KpiCard
          value={summary ? `${summary.sla_compliance_pct}%` : '—'}
          label="SLA Compliance"
          sub="Last 30 days"
          trend="up"
        />
        <KpiCard
          value={summary ? `${summary.avg_resolution_hrs.toFixed(1)}h` : '—'}
          label="Avg Resolution"
          trend="flat"
        />
        <KpiCard
          value={summary ? `${summary.mttr_hrs.toFixed(1)}h` : '—'}
          label="MTTR"
          trend="down"
        />
      </div>

      {/* ── AI Agent cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {AGENTS.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.name} href={a.href} style={{ textDecoration: 'none' }}>
              <div className="card card-hover" style={{
                padding: '16px 18px', cursor: 'pointer',
                borderTop: `3px solid ${a.color}`,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: a.bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} color={a.color} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981' }}>Ready</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>{a.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: a.color, fontWeight: 600 }}>
                  Launch <ArrowRight size={11} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>

        {/* Recent Incidents */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#FFF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={13} color="#F41C5E" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Recent Incidents</span>
            </div>
            <Link href="/tickets" style={{ fontSize: 12, color: '#F41C5E', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div>
            {recent.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div className="skeleton" style={{ height: 12, width: '70%', margin: '0 auto 10px' }} />
                <div className="skeleton" style={{ height: 12, width: '50%', margin: '0 auto' }} />
              </div>
            )}
            {recent.map((inc, i) => (
              <Link
                key={inc.id}
                href={`/incident-pipeline?ticket=${inc.ticket_id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 18px',
                  borderBottom: i < recent.length - 1 ? '1px solid #F9FAFB' : 'none',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: priorityColors[inc.priority] ?? '#9CA3AF',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inc.subject}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#9CA3AF', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                    {inc.ticket_id} · {inc.service_instance}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <StatusChip value={inc.priority} type="priority" />
                  <StatusChip value={inc.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Live Events */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Live Events</span>
            <Link href="/incident-pipeline" style={{ marginLeft: 'auto', fontSize: 12, color: '#F41C5E', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', background: '#0F172A', borderRadius: '0 0 16px 16px', minHeight: 200 }}>
            {liveEvents.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#475569', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                {'> waiting for pipeline events…'}
              </div>
            ) : (
              liveEvents.map((e, i) => (
                <div key={i} style={{
                  padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: i < liveEvents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: EVENT_COLOR[e.type] ?? '#64748B',
                  }} />
                  <span style={{ flex: 1, fontSize: 11.5, color: '#CBD5E1', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                    {e.type}
                  </span>
                  {e.data?.ticket_id != null && (
                    <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                      {String(e.data.ticket_id)}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: '#475569', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{e.ts}</span>
                </div>
              ))
            )}
          </div>

          {/* Quick pipeline CTA */}
          <Link href="/incident-pipeline" style={{ textDecoration: 'none' }}>
            <div style={{
              margin: '12px',
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GitBranch size={15} color="#C7D2FE" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>Run Full Pipeline</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Triage → Intel → IRR → DQ</div>
              </div>
              <ArrowRight size={14} color="rgba(255,255,255,0.4)" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
