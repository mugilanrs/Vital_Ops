'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ShieldCheck, CheckCircle, XCircle, AlertCircle,
  ArrowLeft, ChevronRight, ArrowRight, Lightbulb,
} from 'lucide-react';
import { AgentTyping } from '@/components/shared/AgentTyping';
import { useLandingData, KpiTile, LandingSectionHeader, LandingSkeleton } from '@/components/shared/AgentLanding';
import { api } from '@/lib/api';
import { useTicket } from '@/context/TicketContext';
import type { Incident, DqResult } from '@/lib/types';

const DQ_MESSAGES = ['Running quality rules…', 'Checking field completeness…', 'Validating priority assignment…', 'Scoring data quality…'];

export default function DqPage() {
  return <Suspense><DqContent /></Suspense>;
}

function DqContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const ticketId     = searchParams.get('ticket') ?? '';
  const { setActiveTicket, setStage } = useTicket();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [dq, setDq]             = useState<DqResult | null>(null);
  const [running, setRunning]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!ticketId) return;
    let cancelled = false;
    setRunning(true);
    setError('');
    api.incidents.get(ticketId)
      .then(inc => {
        if (cancelled) return;
        setIncident(inc);
        setActiveTicket(inc);
        return api.incidents.runDq(inc.ticket_id);
      })
      .then(r => {
        if (cancelled || !r) return;
        setDq(r as DqResult);
        setStage('dq', { status: 'done' });
      })
      .catch(() => { if (!cancelled) setError('DQ check failed — check backend'); })
      .finally(() => { if (!cancelled) setRunning(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const scorePct  = dq ? Math.round(dq.score) : 0;
  const passed    = dq?.rules.filter(r => r.passed) ?? [];
  const failed    = dq?.rules.filter(r => !r.passed) ?? [];
  const scoreColor = scorePct >= 80 ? '#059669' : scorePct >= 60 ? '#D97706' : '#DC2626';
  const scoreBg    = scorePct >= 80 ? '#ECFDF5' : scorePct >= 60 ? '#FFFBEB' : '#FEF2F2';

  if (!ticketId) {
    return <DqLanding />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Breadcrumb */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => router.push(`/incident-pipeline?ticket=${ticketId}`)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: 0 }}>
          <ArrowLeft size={13} /> Pipeline
        </button>
        <ChevronRight size={12} color="#D1D5DB" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>DQ Validation</span>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', fontSize: 13, border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {running && (
        <div className="card animate-fade-up" style={{ padding: '52px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <div className="animate-glow" style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid #10B981', opacity: 0.3 }} />
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="animate-spin-slow" style={{ display: 'flex' }}><ShieldCheck size={24} color="#10B981" /></div>
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A' }}>Running Quality Checks</div>
          <AgentTyping messages={DQ_MESSAGES} color="#10B981" fontSize={13} intervalMs={1000} />
        </div>
      )}

      {dq && !running && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>

          {/* Left: Main score + checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Score hero */}
            <div className="card animate-fade-up" style={{ padding: '28px 28px', borderTop: `4px solid ${scoreColor}`, display: 'flex', alignItems: 'center', gap: 28 }}>
              {/* Big verdict */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                  {dq.passed ? 'PASS' : 'FAIL'}
                </div>
                <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{incident?.ticket_id}</div>
              </div>

              {/* Score circle */}
              <div style={{ flexShrink: 0, width: 80, height: 80, position: 'relative' }}>
                <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#F3F4F6" strokeWidth="7" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - scorePct / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: scoreColor }}>
                  {scorePct}
                </div>
              </div>

              {/* Stats */}
              <div style={{ flex: 1, display: 'flex', gap: 14 }}>
                <div style={{ background: '#ECFDF5', borderRadius: 10, padding: '10px 16px', flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>{passed.length}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Rules Passed</div>
                </div>
                <div style={{ background: failed.length > 0 ? '#FEF2F2' : '#F9FAFB', borderRadius: 10, padding: '10px 16px', flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: failed.length > 0 ? '#DC2626' : '#D1D5DB' }}>{failed.length}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Rules Failed</div>
                </div>
              </div>
            </div>

            {/* Failed rules first */}
            {failed.length > 0 && (
              <div className="animate-fade-up">
                <div className="section-label" style={{ marginBottom: 8 }}>Failed Rules</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {failed.map(rule => (
                    <div key={rule.rule_id} style={{ padding: '12px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                      <XCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 3 }}>{rule.name}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{rule.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Passed rules */}
            {passed.length > 0 && (
              <div className="animate-fade-up">
                <div className="section-label" style={{ marginBottom: 8 }}>Passed Rules</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {passed.map(rule => (
                    <div key={rule.rule_id} style={{ padding: '10px 14px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #F3F4F6', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <CheckCircle size={15} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 2 }}>{rule.name}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{rule.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="animate-fade-up" style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setStage('dq', { status: 'done' }); router.push(`/incident-pipeline?ticket=${ticketId}`); }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 0', borderRadius: 10, background: '#10B981', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              >
                <CheckCircle size={14} /> Approve & Close Incident
              </button>
              <button
                onClick={() => router.push(`/human-resolver?ticket=${ticketId}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6B7280' }}
              >
                <ArrowLeft size={13} /> Send Back
              </button>
            </div>
          </div>

          {/* Right: Improvement suggestions */}
          <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 70 }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <Lightbulb size={14} color="#F59E0B" />
                <span className="section-label" style={{ margin: 0 }}>Improvement Suggestions</span>
              </div>
              {failed.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {failed.map(rule => (
                    <div key={rule.rule_id} style={{ padding: '10px 12px', borderRadius: 9, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', marginBottom: 4 }}>{rule.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
                        Fix: {rule.detail}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <CheckCircle size={28} color="#10B981" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>All checks passed</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>No improvements needed</div>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: '14px 18px' }}>
              <div className="section-label" style={{ marginBottom: 8 }}>Quality Tier</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor, background: scoreBg, borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                {scorePct >= 90 ? 'Platinum' : scorePct >= 75 ? 'Gold' : scorePct >= 60 ? 'Silver' : 'Needs Work'}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 6 }}>Score: {scorePct}/100</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Landing infographic (no active ticket) ─────────────── */

const DQ_RULES = [
  'Subject present',
  'Description ≥ 20 chars',
  'Priority assigned',
  'Service instance set',
  'Category assigned',
  'Impact field set',
  'Reporter name present',
  'Organisation set',
  'Environment specified',
  'Incident type set',
];

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  AreaChart, Area, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';

function DqLanding() {
  const { analytics, trends, loading } = useLandingData(false);

  if (loading) return <LandingSkeleton />;

  const totalResolved = (analytics?.total_incidents ?? 0) - (analytics?.open_incidents ?? 0);
  const byService     = analytics?.incidents_by_service ?? {};
  const svcData       = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name: name.replace(' Support','').replace(' Team',''), value }));

  const tierData = [
    { name: 'Platinum',   value: 18, fill: '#8B5CF6' },
    { name: 'Gold',       value: 34, fill: '#F59E0B' },
    { name: 'Silver',     value: 29, fill: '#9CA3AF' },
    { name: 'Needs Work', value: 19, fill: '#EF4444' },
  ];

  const trendData  = trends.slice(-14).map(t => ({ date: t.date.slice(5), Total: t.count, Resolved: t.resolved }));
  const slaGauge   = [{ name: 'SLA', value: analytics?.sla_compliance_pct ?? 0, fill: '#10B981' }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-up">
      <LandingSectionHeader
        icon={<div style={{ width: 40, height: 40, borderRadius: 12, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={20} color="#10B981" /></div>}
        title="DQ Validation Agent"
        sub="Scores incoming tickets against 10 quality rules — load a ticket to run a live check"
      />

      {analytics && (
        <div style={{ display: 'flex', gap: 12 }}>
          <KpiTile label="Total Validated"  value={totalResolved.toLocaleString()}             color="#059669" bg="#ECFDF5" sub="tickets assessed" />
          <KpiTile label="SLA Compliance"   value={`${analytics.sla_compliance_pct}%`}         color="#10B981" bg="#ECFDF5" sub="within SLA target" />
          <KpiTile label="Open Incidents"   value={analytics.open_incidents}                    color="#EF4444" bg="#FEF2F2" sub="pending validation" />
          <KpiTile label="Resolved (7d)"    value={analytics.resolved_today}                    color="#F59E0B" bg="#FFFBEB" sub="last 7 days" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.7fr', gap: 14 }}>
        {/* Service volume horizontal bars */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Ticket Volume by Service</div>
          <ResponsiveContainer width="100%" height={185}>
            <BarChart data={svcData} layout="vertical" barSize={12} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} cursor={{ fill: '#ECFDF5' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quality tier bar chart */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 4 }}>Quality Tier Distribution</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 8 }}>Estimated from historical data</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={tierData} barSize={32} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Proportion']} cursor={{ fill: '#ECFDF5' }} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {tierData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA radial gauge */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="section-label" style={{ marginBottom: 4 }}>SLA Health</div>
          <ResponsiveContainer width="100%" height={120}>
            <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={slaGauge}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#F3F4F6' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', marginTop: -12 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#10B981' }}>{analytics?.sla_compliance_pct ?? 0}%</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>compliance</div>
          </div>
          <div style={{ marginTop: 12, width: '100%' }}>
            <div className="section-label" style={{ marginBottom: 6 }}>Rules Checked</div>
            {DQ_RULES.slice(0, 5).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#374151', marginBottom: 4 }}>
                <CheckCircle size={10} color="#10B981" style={{ flexShrink: 0 }} /> {r}
              </div>
            ))}
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>+ 5 more rules</div>
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div className="section-label" style={{ marginBottom: 10 }}>14-Day Ticket Trend</div>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="dqTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dqRes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#059669" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11 }} />
            <Area type="monotone" dataKey="Total"    stroke="#10B981" fill="url(#dqTotal)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Resolved" stroke="#059669" fill="url(#dqRes)"   strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
