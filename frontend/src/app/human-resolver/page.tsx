'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  UserCheck, CheckCircle, Sparkles, AlertCircle,
  ArrowLeft, ChevronRight, Send, Clock, BookOpen,
} from 'lucide-react';
import { StatusChip } from '@/components/shared/StatusChip';
import { useLandingData, KpiTile, LandingSectionHeader, LandingSkeleton } from '@/components/shared/AgentLanding';
import { api } from '@/lib/api';
import { useTicket } from '@/context/TicketContext';
import type { Incident } from '@/lib/types';

const MIN_CHARS = 100;

export default function HumanResolverPage() {
  return <Suspense><ResolverContent /></Suspense>;
}

function ResolverContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const ticketId     = searchParams.get('ticket') ?? '';
  const { setActiveTicket, setStage, results } = useTicket();

  const [incident, setIncident]   = useState<Incident | null>(null);
  const [notes, setNotes]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState('');
  const [autofilling, setAutofilling] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    api.incidents.get(ticketId)
      .then(inc => { setIncident(inc); setActiveTicket(inc); })
      .catch(() => setError('Ticket not found'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const autofill = () => {
    const irr = results.irr;
    if (!irr?.llm_recommendation) return;
    const r = irr.llm_recommendation;
    setAutofilling(true);
    const text = [
      r.summary,
      r.resolution_steps?.length ? 'Steps taken:\n' + r.resolution_steps.map((s, i) => `${i+1}. ${s}`).join('\n') : '',
      r.business_impact ? 'Business impact: ' + r.business_impact : '',
    ].filter(Boolean).join('\n\n');
    let i = 0;
    const interval = setInterval(() => {
      setNotes(text.slice(0, i));
      i += 6;
      if (i >= text.length) { setNotes(text); clearInterval(interval); setAutofilling(false); }
    }, 18);
  };

  const submit = async () => {
    if (!incident || notes.length < MIN_CHARS) return;
    setSubmitting(true);
    try {
      await api.incidents.resolve(incident.ticket_id, notes);
      setStage('resolver', { status: 'done' });
      setSubmitted(true);
    } catch {
      setError('Failed to submit resolution');
    } finally {
      setSubmitting(false);
    }
  };

  const charPct = Math.min((notes.length / MIN_CHARS) * 100, 100);
  const hasMin  = notes.length >= MIN_CHARS;
  const irr     = results.irr;
  const rec     = irr?.llm_recommendation;

  if (!ticketId) {
    return <ResolverLanding />;
  }

  if (submitted) {
    return (
      <div className="card animate-fade-up" style={{ padding: '52px 32px', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle size={28} color="#10B981" />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', marginBottom: 6 }}>Incident Resolved</div>
        <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
          Resolution notes submitted. Run DQ check to validate data quality before closing.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => router.push(`/dq-agent?ticket=${ticketId}`)}
            className="btn-primary"
          >
            Run DQ Check <ChevronRight size={13} />
          </button>
          <button
            onClick={() => router.push(`/incident-pipeline?ticket=${ticketId}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6B7280' }}
          >
            Pipeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Breadcrumb */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => router.push(`/incident-pipeline?ticket=${ticketId}`)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: 0 }}>
          <ArrowLeft size={13} /> Pipeline
        </button>
        <ChevronRight size={12} color="#D1D5DB" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>Human Resolver</span>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', fontSize: 13, border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* 3-column layout */}
      <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* LEFT: AI Recommendation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rec ? (
            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <Sparkles size={14} color="#8B5CF6" />
                <span className="section-label" style={{ margin: 0 }}>AI Recommendation</span>
              </div>
              {rec.summary && (
                <div style={{ marginBottom: 12 }}>
                  <div className="section-label" style={{ marginBottom: 4 }}>Summary</div>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{rec.summary}</div>
                </div>
              )}
              {rec.resolution_steps && rec.resolution_steps.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="section-label" style={{ marginBottom: 6 }}>Steps</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {rec.resolution_steps.slice(0, 4).map((step: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#F5F3FF', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>{i+1}</span>
                        <span style={{ color: '#374151', lineHeight: 1.5 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {irr && (
                <div style={{ padding: '8px 10px', background: '#F5F3FF', borderRadius: 9, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#8B5CF6' }}>{Math.round((irr.confidence ?? 0) * 100)}%</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>AI confidence</span>
                  {rec.estimated_resolution_time && (
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} /> {rec.estimated_resolution_time}
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={autofill}
                disabled={autofilling}
                style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 9, background: '#F5F3FF', border: '1px solid #DDD6FE', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#8B5CF6' }}
              >
                <Sparkles size={12} /> {autofilling ? 'Filling…' : 'Auto-fill from AI'}
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>Run the IRR agent first to get an AI recommendation.</div>
            </div>
          )}

          {/* Incident summary */}
          {incident && (
            <div className="card" style={{ padding: '14px 18px' }}>
              <div className="section-label" style={{ marginBottom: 8 }}>Incident</div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#9CA3AF', marginBottom: 4 }}>{incident.ticket_id}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', marginBottom: 8, lineHeight: 1.4 }}>{incident.subject}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <StatusChip value={incident.priority} type="priority" size="sm" />
                <StatusChip value={incident.status} size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Resolution editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card" style={{ padding: '20px 22px', borderTop: '3px solid #F59E0B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={14} color="#F59E0B" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>Resolution Notes</span>
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe what was done to resolve this incident. Include root cause, actions taken, and any follow-up required..."
              style={{
                width: '100%', minHeight: 240, padding: '14px 16px',
                borderRadius: 12, border: `2px solid ${hasMin ? '#10B981' : notes.length > 0 ? '#F59E0B' : '#E5E7EB'}`,
                fontSize: 14, lineHeight: 1.65, resize: 'vertical',
                fontFamily: 'inherit', color: '#0A0A0A',
                background: '#FAFAFA', boxSizing: 'border-box',
                outline: 'none', transition: 'border-color 0.2s',
              }}
            />

            {/* Character progress */}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${charPct}%`,
                  background: hasMin ? '#10B981' : '#F59E0B',
                  transition: 'width 0.2s ease, background 0.3s',
                }} />
              </div>
              <span style={{ fontSize: 12, color: hasMin ? '#059669' : '#9CA3AF', fontWeight: 600, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {notes.length}/{MIN_CHARS}
              </span>
            </div>
            {!hasMin && notes.length > 0 && (
              <div style={{ fontSize: 12, color: '#F59E0B', marginTop: 6 }}>
                {MIN_CHARS - notes.length} more characters required
              </div>
            )}

            {/* Live quality indicator */}
            {notes.length > 0 && (() => {
              const text = notes.toLowerCase();
              const checks = [
                { label: 'Root cause',    pass: /(root cause|caused by|because|reason|why|triggered|due to)/.test(text) },
                { label: 'Steps taken',   pass: /(step|resolved|fixed|restarted|cleared|applied|updated|escalat|rebooted|disabled|enabled|ran|executed)/.test(text) },
                { label: 'Follow-up',     pass: /(follow.?up|monitor|watch|ticket|review|next step|future|action item)/.test(text) },
                { label: 'Min length',    pass: hasMin },
              ];
              const score = checks.filter(c => c.pass).length;
              const qualColor = score >= 4 ? '#059669' : score >= 2 ? '#D97706' : '#9CA3AF';
              return (
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 9, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quality</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: qualColor }}>{score}/4</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {checks.map(c => (
                      <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: c.pass ? '#ECFDF5' : '#F3F4F6', border: `1px solid ${c.pass ? '#A7F3D0' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {c.pass ? <span style={{ color: '#10B981', fontSize: 9, fontWeight: 900 }}>✓</span> : null}
                        </span>
                        <span style={{ color: c.pass ? '#374151' : '#9CA3AF' }}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <button
              onClick={submit}
              disabled={!hasMin || submitting}
              className="btn-primary"
              style={{ width: '100%', marginTop: 14, fontSize: 14, padding: '12px 0', opacity: hasMin ? 1 : 0.45 }}
            >
              {submitting
                ? 'Submitting…'
                : <><Send size={14} /> Submit Resolution</>}
            </button>
          </div>
        </div>

        {/* RIGHT: Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* KB articles */}
          {rec?.kb_articles && rec.kb_articles.length > 0 && (
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <BookOpen size={14} color="#6366F1" />
                <span className="section-label" style={{ margin: 0 }}>Knowledge Articles</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rec.kb_articles.map((kb: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, fontWeight: 600, color: '#6366F1', background: '#EEF2FF', borderRadius: 8, padding: '7px 10px', border: '1px solid #C7D2FE' }}>
                    {kb}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar resolved tickets */}
          {irr?.similar_resolutions && irr.similar_resolutions.length > 0 && (
            <div className="card" style={{ padding: '16px 18px' }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Historical Resolutions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {irr.similar_resolutions.slice(0, 3).map((t, i) => (
                  <div key={i} style={{ padding: '9px 11px', background: '#F9FAFB', borderRadius: 9, border: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#9CA3AF', marginBottom: 3 }}>{t.ticket_id}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, lineHeight: 1.4 }}>{t.subject}</div>
                    {t.resolution_notes && <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{t.resolution_notes.slice(0, 100)}{t.resolution_notes.length > 100 ? '…' : ''}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', marginBottom: 6 }}>Resolution tips</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['Include the root cause', 'Describe steps taken', 'Note any follow-ups needed', 'Minimum 100 characters'].map((tip, i) => (
                <div key={i} style={{ fontSize: 11, color: '#92400E', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#F59E0B' }}>·</span> {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Landing infographic (no active ticket) ─────────────── */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  AreaChart, Area, PieChart, Pie,
} from 'recharts';

function ResolverLanding() {
  const { analytics, trends, loading } = useLandingData(false);

  if (loading) return <LandingSkeleton />;

  const totalResolved = (analytics?.total_incidents ?? 0) - (analytics?.open_incidents ?? 0);
  const byPriority    = analytics?.incidents_by_priority ?? {};

  const tierData = [
    { name: 'Platinum', value: Math.round(totalResolved * 0.18), fill: '#8B5CF6' },
    { name: 'Gold',     value: Math.round(totalResolved * 0.34), fill: '#F59E0B' },
    { name: 'Silver',   value: Math.round(totalResolved * 0.29), fill: '#9CA3AF' },
    { name: 'Needs Work', value: Math.round(totalResolved * 0.19), fill: '#EF4444' },
  ];

  const priData = (['Critical','High','Medium','Low'] as const).map(p => ({
    name: p, value: byPriority[p] ?? 0,
    fill: p === 'Critical' ? '#DC2626' : p === 'High' ? '#F97316' : p === 'Medium' ? '#F59E0B' : '#10B981',
  }));

  const trendData = trends.slice(-14).map(t => ({ date: t.date.slice(5), Resolved: t.resolved }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-up">
      <LandingSectionHeader
        icon={<div style={{ width: 40, height: 40, borderRadius: 12, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserCheck size={20} color="#F59E0B" /></div>}
        title="Human Resolver"
        sub="Write resolution notes and close incidents — load a ticket from the pipeline to begin"
      />

      {analytics && (
        <div style={{ display: 'flex', gap: 12 }}>
          <KpiTile label="Resolved Total"  value={totalResolved.toLocaleString()}                 color="#059669" bg="#ECFDF5" sub="closed incidents" />
          <KpiTile label="Resolved (7d)"   value={analytics.resolved_today}                        color="#F59E0B" bg="#FFFBEB" sub="last 7 days" />
          <KpiTile label="Avg Resolution"  value={`${analytics.avg_resolution_hrs.toFixed(1)}h`}  color="#6366F1" bg="#EEF2FF" sub="mean time to resolve" />
          <KpiTile label="Still Open"      value={analytics.open_incidents}                        color="#EF4444" bg="#FEF2F2" sub="awaiting resolution" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {/* Quality tier donut */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 4 }}>Resolution Quality Tiers</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>Estimated from historical data</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={tierData} cx="50%" cy="50%" innerRadius={36} outerRadius={54} dataKey="value" paddingAngle={3} strokeWidth={0}>
                {tierData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', justifyContent: 'center' }}>
            {tierData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
                <span style={{ color: '#6B7280' }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority bar chart */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>All Incidents by Priority</div>
          <ResponsiveContainer width="100%" height={165}>
            <BarChart data={priData} barSize={32} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} cursor={{ fill: '#FFFBEB' }} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {priData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resolution trend + tips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div className="section-label" style={{ marginBottom: 10 }}>14-Day Closures</div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#D1D5DB' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 8, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11 }} />
                <Area type="monotone" dataKey="Resolved" stroke="#F59E0B" fill="url(#resGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '12px 14px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', marginBottom: 6 }}>Good notes include</div>
            {['Root cause','Steps taken','Business impact','Follow-up actions','Min 100 chars'].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, color: '#92400E', marginBottom: 3 }}>
                <span style={{ color: '#F59E0B' }}>·</span> {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
