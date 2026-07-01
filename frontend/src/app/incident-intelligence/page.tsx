'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Brain, AlertCircle, Clock, TrendingUp, Activity,
  ChevronRight, ArrowLeft, Hash, Sparkles, CheckCircle,
} from 'lucide-react';
import { StatusChip } from '@/components/shared/StatusChip';
import { AgentTyping } from '@/components/shared/AgentTyping';
import { Drawer } from '@/components/shared/Drawer';
import { useLandingData, KpiTile, HBar, LandingSectionHeader, LandingSkeleton } from '@/components/shared/AgentLanding';
import { api } from '@/lib/api';
import { useTicket } from '@/context/TicketContext';
import type { Incident, IntelligenceResult, SimilarTicket } from '@/lib/types';

const INTEL_MESSAGES = ['Embedding ticket…', 'Querying Qdrant vector index…', 'Computing cosine similarity…', 'Finding correlated open incidents…', 'Ranking matches…'];

export default function IntelligencePage() {
  return <Suspense><IntelligenceContent /></Suspense>;
}

function IntelligenceContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const ticketId     = searchParams.get('ticket') ?? '';
  const { setActiveTicket, setStage, results, setResult } = useTicket();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [intel, setIntel]       = useState<IntelligenceResult | null>(results.intelligence);
  const [running, setRunning]   = useState(false);
  const [error, setError]       = useState('');

  const [drawerTicket, setDrawerTicket] = useState<SimilarTicket | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);

  const openDrawer = (t: SimilarTicket) => { setDrawerTicket(t); setDrawerOpen(true); };

  useEffect(() => {
    if (!ticketId) return;
    if (results.intelligence) {
      setIntel(results.intelligence);
      api.incidents.get(ticketId).then(inc => { setIncident(inc); setActiveTicket(inc); }).catch(() => {});
      return;
    }
    let cancelled = false;
    setRunning(true);
    setError('');
    api.incidents.get(ticketId)
      .then(inc => {
        if (cancelled) return;
        setIncident(inc);
        setActiveTicket(inc);
        return api.incidents.runIntelligence(inc.ticket_id);
      })
      .then(r => {
        if (cancelled || !r) return;
        setIntel(r as IntelligenceResult);
        setResult('intelligence', r as IntelligenceResult);
        setStage('intelligence', { status: 'done' });
      })
      .catch(() => { if (!cancelled) setError('Intelligence agent failed — check backend'); })
      .finally(() => { if (!cancelled) setRunning(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const similarCount    = intel?.similar_tickets?.length ?? 0;
  const correlatedCount = intel?.correlated_open_tickets?.length ?? 0;

  if (!ticketId) {
    return <IntelligenceLanding />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => router.push(`/incident-pipeline?ticket=${ticketId}`)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: 0 }}>
          <ArrowLeft size={13} /> Pipeline
        </button>
        <ChevronRight size={12} color="#D1D5DB" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#6366F1' }}>Incident Intelligence</span>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', fontSize: 13, border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {running && (
        <div className="card animate-fade-up" style={{ padding: '52px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <div className="animate-glow" style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid #6366F1', opacity: 0.3 }} />
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="animate-spin-slow" style={{ display: 'flex' }}><Brain size={24} color="#6366F1" /></div>
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A' }}>Searching Historical Incidents</div>
          <AgentTyping messages={INTEL_MESSAGES} color="#6366F1" fontSize={13} intervalMs={1100} />
        </div>
      )}

      {intel && !running && (
        <>
          {/* Stats banner */}
          <div className="card animate-fade-up" style={{ padding: '16px 22px', display: 'flex', gap: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, paddingRight: 20, borderRight: '1px solid #F3F4F6' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={17} color="#6366F1" />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: similarCount > 0 ? '#6366F1' : '#D1D5DB' }}>{similarCount}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: similarCount > 0 ? '#6366F1' : '#9CA3AF' }}>Similar Historical</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Resolved · vector match</div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: correlatedCount > 0 ? '#FFFBEB' : '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Activity size={17} color={correlatedCount > 0 ? '#F59E0B' : '#D1D5DB'} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: correlatedCount > 0 ? '#F59E0B' : '#D1D5DB' }}>{correlatedCount}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: correlatedCount > 0 ? '#B45309' : '#9CA3AF' }}>Correlated Open</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Same service · active now</div>
              </div>
            </div>
          </div>

          {/* Similar tickets cards */}
          {similarCount > 0 ? (
            <div className="animate-fade-up">
              <div className="section-label" style={{ marginBottom: 10 }}>Similar Historical Tickets — {similarCount} matches</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {(intel.similar_tickets ?? []).map((t: SimilarTicket, i: number) => (
                  <SimilarCard key={i} ticket={t} rank={i + 1} onClick={() => openDrawer(t)} />
                ))}
              </div>
            </div>
          ) : (
            <div className="card animate-fade-up" style={{ padding: '36px 24px', textAlign: 'center' }}>
              <Brain size={32} color="#C7D2FE" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#6366F1', marginBottom: 5 }}>No vector matches found</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                Novel incident type — no resolved tickets matched this signature in the vector index.
              </div>
            </div>
          )}

          {/* Correlated open incidents */}
          {correlatedCount > 0 && (
            <div className="animate-fade-up">
              <div className="section-label" style={{ marginBottom: 10 }}>Correlated Open Incidents — {correlatedCount} active</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {(intel.correlated_open_tickets ?? []).map((t: SimilarTicket, i: number) => (
                  <button key={i} onClick={() => openDrawer(t)} style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <div
                      style={{ padding: '12px 14px', borderRadius: 12, background: '#FFFBEB', border: '1px solid #FDE68A', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(245,158,11,0.15)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#F59E0B'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = '#FDE68A'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <Hash size={11} color="#F59E0B" />
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#B45309', fontWeight: 600 }}>{t.ticket_id}</span>
                        <StatusChip value={t.priority} type="priority" size="sm" />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', lineHeight: 1.4, marginBottom: 5 }}>{t.subject}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{t.service_instance} · View details →</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next step CTA */}
          <div className="animate-fade-up" style={{ padding: '14px 18px', borderRadius: 12, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={15} color="#6366F1" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>Intelligence complete</div>
                <div style={{ fontSize: 12, color: '#818CF8' }}>Ready for IRR synthesis</div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/irr-agent?ticket=${ticketId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: '#6366F1', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
            >
              IRR Agent <ChevronRight size={13} />
            </button>
          </div>
        </>
      )}

      {/* Ticket detail drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerTicket?.ticket_id ?? ''} subtitle={drawerTicket?.subject}>
        {drawerTicket && <TicketDetailDrawer ticket={drawerTicket} />}
      </Drawer>
    </div>
  );
}

/* ── Landing infographic (no active ticket) ─────────────── */

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  AreaChart, Area, PieChart, Pie,
} from 'recharts';

const SVC_COLORS = ['#6366F1','#8B5CF6','#A78BFA','#6366F1','#8B5CF6','#A78BFA','#C4B5FD','#DDD6FE'];
const PRI_CLRS: Record<string, string> = { Critical: '#DC2626', High: '#F97316', Medium: '#F59E0B', Low: '#10B981' };

function IntelligenceLanding() {
  const { analytics, trends, loading } = useLandingData(false);

  if (loading) return <LandingSkeleton />;

  const byService  = analytics?.incidents_by_service  ?? {};
  const byPriority = analytics?.incidents_by_priority ?? {};
  const svcData    = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value], i) => ({ name: name.replace(' Support','').replace(' Team',''), value, fill: SVC_COLORS[i] }));
  const priData    = (['Critical','High','Medium','Low'] as const)
    .map(p => ({ name: p, value: byPriority[p] ?? 0, fill: PRI_CLRS[p] }));
  const totalResolved = (analytics?.total_incidents ?? 0) - (analytics?.open_incidents ?? 0);
  const trendData  = trends.slice(-14).map(t => ({ date: t.date.slice(5), Total: t.count, Resolved: t.resolved }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-up">
      <LandingSectionHeader
        icon={<div style={{ width: 40, height: 40, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={20} color="#6366F1" /></div>}
        title="Incident Intelligence"
        sub="Semantic search across historical incidents — load a ticket to find similar resolutions"
      />

      {analytics && (
        <div style={{ display: 'flex', gap: 12 }}>
          <KpiTile label="Knowledge Base"  value={analytics.total_incidents.toLocaleString()}      color="#6366F1" bg="#EEF2FF" sub="total indexed tickets" />
          <KpiTile label="Resolved"        value={totalResolved.toLocaleString()}                  color="#059669" bg="#ECFDF5" sub="available as resolutions" />
          <KpiTile label="MTTR"            value={`${analytics.avg_resolution_hrs.toFixed(1)}h`}   color="#8B5CF6" bg="#F5F3FF" sub="mean time to resolve" />
          <KpiTile label="SLA Compliance"  value={`${analytics.sla_compliance_pct}%`}              color="#F59E0B" bg="#FFFBEB" sub="within SLA target" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: 14 }}>
        {/* Service volume bar chart (horizontal) */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Historical Volume by Service</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={svcData} layout="vertical" barSize={14} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} cursor={{ fill: '#F5F3FF' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {svcData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Priority pie */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div className="section-label" style={{ marginBottom: 4 }}>Priority Split</div>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={priData} cx="50%" cy="50%" outerRadius={48} dataKey="value" paddingAngle={2} strokeWidth={0}>
                  {priData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'center' }}>
              {priData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
                  <span style={{ color: '#6B7280' }}>{d.name} <strong style={{ color: d.fill }}>{d.value}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="section-label" style={{ marginBottom: 8 }}>How it works</div>
            {['Embed ticket via sentence transformer','Query Qdrant vector index','Rank by cosine similarity','Surface correlated open tickets'].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: '#374151', marginBottom: 5 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#EEF2FF', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, flexShrink: 0 }}>{i+1}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 14-day area chart */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div className="section-label" style={{ marginBottom: 10 }}>14-Day Incident Trend</div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="intelTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="intelRes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11 }} />
            <Area type="monotone" dataKey="Total"    stroke="#6366F1" fill="url(#intelTotal)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Resolved" stroke="#10B981" fill="url(#intelRes)"   strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SimilarCard({ ticket: t, rank, onClick }: { ticket: SimilarTicket; rank: number; onClick: () => void }) {
  const pct = Math.round(t.score * 100);
  return (
    <button onClick={onClick} style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <div
        style={{ padding: '14px 16px', borderRadius: 14, background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.15s' }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 24px rgba(99,102,241,0.12)'; el.style.borderColor = '#C7D2FE'; el.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)'; el.style.borderColor = '#E5E7EB'; el.style.transform = 'translateY(0)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: `rgba(99,102,241,${0.12 + t.score * 0.3})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 800, color: '#6366F1' }}>
            {rank}
          </div>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#9CA3AF', flex: 1 }}>{t.ticket_id}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: `rgba(99,102,241,${0.4 + t.score * 0.6})`, padding: '2px 8px', borderRadius: 20 }}>
            {pct}%
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4, marginBottom: 8 }}>{t.subject}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <StatusChip value={t.priority} type="priority" size="sm" />
          <StatusChip value={t.status} size="sm" />
          {t.assigned_team && <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', borderRadius: 5, padding: '2px 7px', fontWeight: 500 }}>{t.assigned_team}</span>}
        </div>
        {t.resolution_notes && (
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, marginBottom: 8 }}>
            {t.resolution_notes.length > 90 ? t.resolution_notes.slice(0, 90) + '…' : t.resolution_notes}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {t.avg_resolution_hrs != null && (
            <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />{t.avg_resolution_hrs.toFixed(1)}h
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6366F1', display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
            View details <ChevronRight size={11} />
          </span>
        </div>
      </div>
    </button>
  );
}

function TicketDetailDrawer({ ticket: t }: { ticket: SimilarTicket }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <StatusChip value={t.priority} type="priority" size="sm" />
        <StatusChip value={t.status} size="sm" />
        {t.assigned_team && <span style={{ fontSize: 11, background: '#F3F4F6', color: '#6B7280', borderRadius: 6, padding: '3px 9px', fontWeight: 500 }}>{t.assigned_team}</span>}
        {t.category && <span style={{ fontSize: 11, background: '#F3F4F6', color: '#6B7280', borderRadius: 6, padding: '3px 9px', fontWeight: 500 }}>{t.category}</span>}
        {t.service_instance && <span style={{ fontSize: 11, background: '#EEF2FF', color: '#6366F1', borderRadius: 6, padding: '3px 9px', fontWeight: 500 }}>{t.service_instance}</span>}
      </div>

      {t.score !== undefined && (
        <div style={{ padding: '12px 14px', background: '#EEF2FF', borderRadius: 12, border: '1px solid #C7D2FE' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4F46E5' }}>Vector Similarity</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#6366F1' }}>{Math.round(t.score * 100)}%</span>
          </div>
          <div style={{ height: 5, background: '#C7D2FE', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(t.score * 100)}%`, background: '#6366F1', borderRadius: 99 }} />
          </div>
        </div>
      )}

      {t.avg_resolution_hrs != null && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 3 }}>Resolution Time</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0A0A0A', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={13} color="#9CA3AF" />{t.avg_resolution_hrs.toFixed(1)}h
            </div>
          </div>
          <div style={{ flex: 1, background: '#ECFDF5', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 3 }}>Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={13} color="#10B981" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{t.status}</span>
            </div>
          </div>
        </div>
      )}

      {t.description && (
        <div>
          <div className="section-label" style={{ marginBottom: 6 }}>Description</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, padding: '12px 14px', background: '#F9FAFB', borderRadius: 10 }}>
            {t.description}
          </div>
        </div>
      )}

      {t.resolution_notes && (
        <div>
          <div className="section-label" style={{ marginBottom: 6 }}>Resolution Notes</div>
          <div style={{ fontSize: 13, color: '#065F46', lineHeight: 1.65, padding: '12px 14px', background: '#ECFDF5', borderRadius: 10, border: '1px solid #A7F3D0' }}>
            {t.resolution_notes}
          </div>
        </div>
      )}
    </div>
  );
}
