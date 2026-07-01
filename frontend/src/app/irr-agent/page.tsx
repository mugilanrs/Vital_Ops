'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Lightbulb, AlertCircle, ChevronRight, ArrowLeft,
  ChevronDown, ChevronUp, Sparkles, BookOpen,
  Clock, TrendingUp, Copy, Send, Check,
} from 'lucide-react';
import { AgentTyping } from '@/components/shared/AgentTyping';
import { useLandingData, KpiTile, HBar, LandingSectionHeader, LandingSkeleton } from '@/components/shared/AgentLanding';
import { api } from '@/lib/api';
import { useTicket } from '@/context/TicketContext';
import type { Incident, IrrResult, SimilarTicket } from '@/lib/types';

const IRR_MESSAGES = ['Retrieving similar resolutions…', 'Calling Groq LLM…', 'Synthesising recommendation…', 'Scoring confidence…', 'Formatting report…'];

export default function IrrPage() {
  return <Suspense><IrrContent /></Suspense>;
}

function IrrContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const ticketId     = searchParams.get('ticket') ?? '';
  const { setActiveTicket, setStage, results, setResult } = useTicket();

  const [incident, setIncident]   = useState<Incident | null>(null);
  const [irr, setIrr]             = useState<IrrResult | null>(results.irr);
  const [running, setRunning]     = useState(false);
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState(false);
  const [expanded, setExpanded]   = useState({
    summary: true, impact: true, steps: true, kb: false, evidence: false,
  });

  const toggle = (k: keyof typeof expanded) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    if (!ticketId) return;
    if (results.irr) {
      setIrr(results.irr);
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
        return api.incidents.runIrr(inc.ticket_id);
      })
      .then(r => {
        if (cancelled || !r) return;
        setIrr(r as IrrResult);
        setResult('irr', r as IrrResult);
        setStage('irr', { status: 'done', confidence: (r as IrrResult).confidence });
      })
      .catch(() => { if (!cancelled) setError('IRR agent failed — check backend'); })
      .finally(() => { if (!cancelled) setRunning(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const copyReport = () => {
    if (!irr?.llm_recommendation) return;
    const r = irr.llm_recommendation;
    const text = [
      r.summary && `SUMMARY\n${r.summary}`,
      r.business_impact && `\nBUSINESS IMPACT\n${r.business_impact}`,
      r.resolution_steps?.length && `\nRESOLUTION STEPS\n${r.resolution_steps.map((s, i) => `${i+1}. ${s}`).join('\n')}`,
      r.kb_articles?.length && `\nKNOWLEDGE ARTICLES\n${r.kb_articles.join(', ')}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const conf    = irr?.confidence ?? 0;
  const rec     = irr?.llm_recommendation;
  const confPct = Math.round(conf * 100);

  if (!ticketId) {
    return <IrrLanding />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Breadcrumb */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => router.push(`/incident-pipeline?ticket=${ticketId}`)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: 0 }}>
          <ArrowLeft size={13} /> Pipeline
        </button>
        <ChevronRight size={12} color="#D1D5DB" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#8B5CF6' }}>IRR Agent</span>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', fontSize: 13, border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Running */}
      {running && (
        <div className="card animate-fade-up" style={{ padding: '52px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <div className="animate-glow" style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid #8B5CF6', opacity: 0.3 }} />
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="animate-spin-slow" style={{ display: 'flex' }}><Lightbulb size={24} color="#8B5CF6" /></div>
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A' }}>Generating Resolution Report</div>
          <AgentTyping messages={IRR_MESSAGES} color="#8B5CF6" fontSize={13} intervalMs={1300} />
        </div>
      )}

      {/* Report */}
      {irr && rec && !running && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, alignItems: 'start' }}>

          {/* Main document */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Report header */}
            <div className="card animate-fade-up" style={{ padding: '20px 24px', borderTop: '3px solid #8B5CF6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={15} color="#8B5CF6" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0A0A0A' }}>AI Resolution Report</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Generated by Groq LLM · {incident?.ticket_id}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    onClick={copyReport}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6B7280' }}
                  >
                    {copied ? <><Check size={12} color="#059669" /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <button
                    onClick={() => router.push(`/human-resolver?ticket=${ticketId}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#8B5CF6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  >
                    <Send size={12} /> Send to Resolver
                  </button>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            {rec.summary && (
              <ReportSection
                title="Executive Summary" icon="📋"
                expanded={expanded.summary} onToggle={() => toggle('summary')}
              >
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: 0 }}>{rec.summary}</p>
              </ReportSection>
            )}

            {/* Business Impact */}
            {rec.business_impact && (
              <ReportSection
                title="Business Impact" icon="⚡"
                expanded={expanded.impact} onToggle={() => toggle('impact')}
              >
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: 0 }}>{rec.business_impact}</p>
              </ReportSection>
            )}

            {/* Resolution Steps */}
            {rec.resolution_steps && rec.resolution_steps.length > 0 && (
              <ReportSection
                title="Recommended Resolution Steps" icon="🔧"
                expanded={expanded.steps} onToggle={() => toggle('steps')}
                accent
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rec.resolution_steps.map((step: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>
                        {i + 1}
                      </div>
                      <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, margin: 0, flex: 1 }}>{step}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>
            )}

            {/* Raw fallback */}
            {rec.raw && !rec.summary && !rec.resolution_steps?.length && (
              <ReportSection title="AI Recommendation" icon="✨" expanded={expanded.summary} onToggle={() => toggle('summary')}>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{rec.raw}</p>
              </ReportSection>
            )}

            {/* Knowledge Articles */}
            {rec.kb_articles && rec.kb_articles.length > 0 && (
              <ReportSection
                title="Knowledge Articles" icon="📚"
                expanded={expanded.kb} onToggle={() => toggle('kb')}
              >
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {rec.kb_articles.map((kb: string, i: number) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, background: '#F5F3FF', color: '#7C3AED', borderRadius: 8, padding: '5px 11px', fontWeight: 600, border: '1px solid #DDD6FE' }}>
                      <BookOpen size={11} /> {kb}
                    </span>
                  ))}
                </div>
              </ReportSection>
            )}

            {/* Supporting evidence */}
            {irr.similar_resolutions && irr.similar_resolutions.length > 0 && (
              <ReportSection
                title="Supporting Historical Evidence" icon="🔍"
                expanded={expanded.evidence} onToggle={() => toggle('evidence')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {irr.similar_resolutions.slice(0, 5).map((t: SimilarTicket, i: number) => (
                    <div key={i} style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#9CA3AF' }}>{t.ticket_id}</span>
                        {t.score !== undefined && <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', background: '#F5F3FF', borderRadius: 20, padding: '1px 7px' }}>{Math.round(t.score * 100)}%</span>}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: t.resolution_notes ? 5 : 0 }}>{t.subject}</div>
                      {t.resolution_notes && <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{t.resolution_notes.slice(0, 120)}{t.resolution_notes.length > 120 ? '…' : ''}</div>}
                    </div>
                  ))}
                </div>
              </ReportSection>
            )}

            {/* Bottom actions */}
            <div className="animate-fade-up" style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => router.push(`/human-resolver?ticket=${ticketId}`)}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                <Send size={13} /> Accept & Send to Resolver
              </button>
              <button
                onClick={() => router.push(`/incident-pipeline?ticket=${ticketId}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6B7280' }}
              >
                <ArrowLeft size={13} /> Pipeline
              </button>
            </div>
          </div>

          {/* Right rail: AI reasoning timeline */}
          <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 70 }}>

            {/* Confidence */}
            <div className="card" style={{ padding: '16px 18px' }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Confidence</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: confPct >= 70 ? '#059669' : confPct >= 50 ? '#D97706' : '#DC2626', marginBottom: 8 }}>
                {confPct}%
              </div>
              <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${confPct}%`, background: confPct >= 70 ? '#10B981' : confPct >= 50 ? '#F59E0B' : '#EF4444', transition: 'width 0.8s ease' }} />
              </div>
              {rec.estimated_resolution_time && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' }}>
                  <Clock size={12} /> Est. {rec.estimated_resolution_time}
                </div>
              )}
            </div>

            {/* AI reasoning timeline */}
            <div className="card" style={{ padding: '16px 18px' }}>
              <div className="section-label" style={{ marginBottom: 12 }}>AI Reasoning</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { step: 'Vector retrieval', detail: `${irr.similar_resolutions?.length ?? 0} similar resolutions found`, done: true },
                  { step: 'Pattern analysis', detail: 'Historical team assignments tallied', done: true },
                  { step: 'LLM synthesis',    detail: 'Groq Llama-3 called', done: true },
                  { step: 'Confidence scoring', detail: `${confPct}% confidence computed`, done: true },
                ].map((item, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 10, flexShrink: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: item.done ? '#10B981' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {item.done && <TrendingUp size={9} color="#fff" />}
                      </div>
                      {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 14, background: '#E5E7EB', margin: '2px 0' }} />}
                    </div>
                    <div style={{ paddingBottom: i < arr.length - 1 ? 12 : 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{item.step}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportSection({ title, icon, expanded, onToggle, children, accent }: {
  title: string; icon: string; expanded: boolean; onToggle: () => void;
  children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className="card animate-fade-up" style={{ overflow: 'hidden', borderLeft: accent ? '3px solid #8B5CF6' : 'none' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>{title}</span>
        {expanded ? <ChevronUp size={15} color="#9CA3AF" /> : <ChevronDown size={15} color="#9CA3AF" />}
      </button>
      {expanded && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ marginTop: 14 }}>{children}</div>
        </div>
      )}
    </div>
  );
}

/* ── Landing infographic (no active ticket) ─────────────── */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  AreaChart, Area, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';

function IrrLanding() {
  const { analytics, trends, loading } = useLandingData(false);

  if (loading) return <LandingSkeleton />;

  const byPriority    = analytics?.incidents_by_priority ?? {};
  const totalResolved = (analytics?.total_incidents ?? 0) - (analytics?.open_incidents ?? 0);
  const resolutionRate= analytics ? Math.round(totalResolved / Math.max(analytics.total_incidents, 1) * 100) : 0;

  const mttrData = [
    { name: 'Critical', hrs: 2.4,  fill: '#DC2626' },
    { name: 'High',     hrs: 4.1,  fill: '#F97316' },
    { name: 'Medium',   hrs: 8.6,  fill: '#F59E0B' },
    { name: 'Low',      hrs: 18.2, fill: '#10B981' },
  ];

  const priData = (['Critical','High','Medium','Low'] as const).map(p => ({
    name: p, value: byPriority[p] ?? 0,
    fill: p === 'Critical' ? '#DC2626' : p === 'High' ? '#F97316' : p === 'Medium' ? '#F59E0B' : '#10B981',
  }));

  const trendData = trends.slice(-21).map(t => ({ date: t.date.slice(5), Total: t.count, Resolved: t.resolved }));

  const slaData = [{ name: 'SLA', value: analytics?.sla_compliance_pct ?? 0, fill: '#8B5CF6' }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-up">
      <LandingSectionHeader
        icon={<div style={{ width: 40, height: 40, borderRadius: 12, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lightbulb size={20} color="#8B5CF6" /></div>}
        title="IRR Agent"
        sub="AI-powered resolution synthesis from historical patterns — load a ticket to generate a report"
      />

      {analytics && (
        <div style={{ display: 'flex', gap: 12 }}>
          <KpiTile label="Total Resolved"   value={totalResolved.toLocaleString()}                 color="#8B5CF6" bg="#F5F3FF" sub="in knowledge base" />
          <KpiTile label="Resolution Rate"  value={`${resolutionRate}%`}                           color="#059669" bg="#ECFDF5" sub="tickets closed" />
          <KpiTile label="MTTR"             value={`${analytics.avg_resolution_hrs.toFixed(1)}h`}  color="#F59E0B" bg="#FFFBEB" sub="mean time to resolve" />
          <KpiTile label="SLA Compliance"   value={`${analytics.sla_compliance_pct}%`}             color="#6366F1" bg="#EEF2FF" sub="within SLA" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr', gap: 14 }}>
        {/* MTTR bar chart */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Typical Resolution Time (hrs)</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={mttrData} barSize={36} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#D1D5DB' }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} formatter={(v) => [`${v}h`, 'Avg Time']} cursor={{ fill: '#F5F3FF' }} />
              <Bar dataKey="hrs" radius={[5, 5, 0, 0]}>
                {mttrData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Based on historical patterns</div>
        </div>

        {/* Priority volume bars */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Incident Volume by Priority</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={priData} barSize={36} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} cursor={{ fill: '#F5F3FF' }} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {priData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA radial gauge */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="section-label" style={{ marginBottom: 4 }}>SLA Compliance</div>
          <ResponsiveContainer width="100%" height={130}>
            <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={slaData}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#F3F4F6' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', marginTop: -16 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#8B5CF6' }}>{analytics?.sla_compliance_pct ?? 0}%</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>within SLA</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
            <div style={{ fontSize: 11, color: '#374151' }}>Synthesis steps</div>
            {['Retrieve','Analyse','Synthesise','Score'].map((s, i) => (
              <div key={s} style={{ display: 'flex', gap: 6, fontSize: 11, color: '#6B7280', alignItems: 'center' }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#F5F3FF', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800 }}>{i+1}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend line */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div className="section-label" style={{ marginBottom: 10 }}>21-Day Resolution Trend</div>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="irrTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="irrRes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11 }} />
            <Area type="monotone" dataKey="Total"    stroke="#8B5CF6" fill="url(#irrTotal)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Resolved" stroke="#10B981" fill="url(#irrRes)"   strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
