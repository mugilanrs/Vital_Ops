'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Play, CheckCircle, Loader, AlertCircle, Target,
  Brain, Lightbulb, UserCheck, ShieldCheck, ArrowRight,
  Clock, Zap, RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useTicket } from '@/context/TicketContext';
import { StatusChip } from '@/components/shared/StatusChip';
import { AgentTyping } from '@/components/shared/AgentTyping';
import type { Incident } from '@/lib/types';

const STAGES = [
  {
    key:    'received',
    label:  'Incident Received',
    icon:   Zap,
    color:  '#10B981',
    bg:     '#ECFDF5',
    href:   null,
    typing: [],
  },
  {
    key:    'triage',
    label:  'Auto-Triage',
    icon:   Target,
    color:  '#F41C5E',
    bg:     '#FFF0F4',
    href:   '/auto-triage',
    typing: ['Embedding ticket…', 'Searching vector index…', 'Tallying team scores…', 'Ranking engineers…'],
  },
  {
    key:    'intelligence',
    label:  'Incident Intelligence',
    icon:   Brain,
    color:  '#6366F1',
    bg:     '#EEF2FF',
    href:   '/incident-intelligence',
    typing: ['Querying Qdrant…', 'Computing similarity…', 'Finding correlated open tickets…', 'Ranking matches…'],
  },
  {
    key:    'irr',
    label:  'IRR Agent',
    icon:   Lightbulb,
    color:  '#8B5CF6',
    bg:     '#F5F3FF',
    href:   '/irr-agent',
    typing: ['Retrieving resolutions…', 'Calling Groq LLM…', 'Synthesising recommendation…', 'Scoring confidence…'],
  },
  {
    key:    'resolver',
    label:  'Human Resolution',
    icon:   UserCheck,
    color:  '#F59E0B',
    bg:     '#FFFBEB',
    href:   '/human-resolver',
    typing: [],
  },
  {
    key:    'dq',
    label:  'DQ Validation',
    icon:   ShieldCheck,
    color:  '#10B981',
    bg:     '#ECFDF5',
    href:   '/dq-agent',
    typing: ['Running quality rules…', 'Checking completeness…', 'Validating fields…'],
  },
];

type PipelineStatus = 'idle' | 'running' | 'complete' | 'error';

export default function IncidentPipelinePage() {
  return <Suspense><PipelineContent /></Suspense>;
}

function PipelineContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const paramTicket  = searchParams.get('ticket') ?? '';
  const { activeTicket, setActiveTicket, stages, setStage, results, setResult, resetPipeline } = useTicket();

  const [ticketSearch, setTicketSearch] = useState(paramTicket || activeTicket?.ticket_id || '');
  const [incident, setIncident]         = useState<Incident | null>(activeTicket);
  const [pipeStatus, setPipeStatus]     = useState<PipelineStatus>('idle');
  const [loadError, setLoadError]       = useState('');

  /* Sync pipeStatus with context stages on mount / when stages change */
  useEffect(() => {
    const AI_KEYS = ['triage', 'intelligence', 'irr'] as const;
    const allDone    = AI_KEYS.every(k => stages[k]?.status === 'done');
    const anyRunning = AI_KEYS.some(k => stages[k]?.status === 'running');
    const anyError   = AI_KEYS.some(k => stages[k]?.status === 'error');
    if (allDone)    setPipeStatus('complete');
    else if (anyRunning) setPipeStatus('running');
    else if (anyError)   setPipeStatus('error');
  }, [stages]);

  /* Load ticket from URL param */
  useEffect(() => {
    if (!paramTicket) return;
    if (activeTicket?.ticket_id === paramTicket) {
      setIncident(activeTicket);
      return;
    }
    api.incidents.get(paramTicket)
      .then(inc => { setIncident(inc); setActiveTicket(inc); setLoadError(''); })
      .catch(() => setLoadError(`Ticket "${paramTicket}" not found`));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramTicket]);

  const loadTicket = async () => {
    const id = ticketSearch.trim();
    if (!id) return;
    setLoadError('');
    try {
      const inc = await api.incidents.get(id);
      setIncident(inc);
      setActiveTicket(inc);
      resetPipeline();
      setPipeStatus('idle');
      router.replace(`/incident-pipeline?ticket=${id}`);
    } catch {
      setLoadError(`Ticket "${id}" not found`);
    }
  };

  const runPipeline = async () => {
    if (!incident) return;
    const id = incident.ticket_id;
    resetPipeline();
    setPipeStatus('running');

    const runStage = async (key: 'triage' | 'intelligence' | 'irr', fn: () => Promise<unknown>) => {
      setStage(key, { status: 'running' });
      const t0 = Date.now();
      try {
        const res = await fn();
        const ms  = Date.now() - t0;
        const conf = (res as { confidence?: number })?.confidence;
        setStage(key, { status: 'done', durationMs: ms, confidence: conf });
        setResult(key, res as never);
      } catch (e) {
        setStage(key, { status: 'error', error: e instanceof Error ? e.message : 'Failed' });
        throw e;
      }
    };

    try {
      await runStage('triage',       () => api.incidents.runTriage(id));
      await runStage('intelligence', () => api.incidents.runIntelligence(id));
      await runStage('irr',          () => api.incidents.runIrr(id));
      setPipeStatus('complete');
    } catch {
      setPipeStatus('error');
    }
  };

  const retryStage = async (key: 'triage' | 'intelligence' | 'irr') => {
    if (!incident) return;
    const id = incident.ticket_id;
    setStage(key, { status: 'running' });
    const t0 = Date.now();
    try {
      const fn = key === 'triage'       ? () => api.incidents.runTriage(id)
               : key === 'intelligence' ? () => api.incidents.runIntelligence(id)
               :                          () => api.incidents.runIrr(id);
      const res  = await fn();
      const ms   = Date.now() - t0;
      const conf = (res as { confidence?: number })?.confidence;
      setStage(key, { status: 'done', durationMs: ms, confidence: conf });
      setResult(key, res as never);

      // Check if all AI stages are done now
      const keys: Array<'triage' | 'intelligence' | 'irr'> = ['triage', 'intelligence', 'irr'];
      const allDone = keys.every(k => k === key ? true : stages[k]?.status === 'done');
      if (allDone) setPipeStatus('complete');
    } catch (e) {
      setStage(key, { status: 'error', error: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const isRunning = pipeStatus === 'running';
  const isDone    = pipeStatus === 'complete';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Ticket loader ── */}
      <div className="card animate-fade-up" style={{ padding: '16px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label className="section-label">Ticket ID</label>
          <input
            value={ticketSearch}
            onChange={e => setTicketSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadTicket()}
            placeholder="e.g. INC-001234 or LIVE-ABCD1234"
            style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'var(--font-mono)', boxSizing: 'border-box', background: '#FAFAFA' }}
          />
        </div>
        <button className="btn-secondary" onClick={loadTicket} disabled={isRunning}>Load</button>
      </div>

      {loadError && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', fontSize: 13, border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {loadError}
        </div>
      )}

      {/* ── Incident summary card ── */}
      {incident && (
        <div className="card animate-fade-up" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, color: '#9CA3AF', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{incident.ticket_id}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.3, marginBottom: 5 }}>{incident.subject}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                {[incident.service_instance, incident.organisation, incident.environment].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
              <StatusChip value={incident.priority} type="priority" size="md" />
              <StatusChip value={incident.status} size="md" />
            </div>
          </div>

          {/* Start / restart button */}
          {!isRunning && (
            <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              {pipeStatus === 'idle' && (
                <button className="btn-primary" onClick={runPipeline} style={{ gap: 8 }}>
                  <Play size={13} fill="#fff" /> Start AI Analysis
                </button>
              )}
              {pipeStatus === 'complete' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#059669' }}>
                    <CheckCircle size={15} /> AI Analysis Complete
                  </div>
                  <button
                    onClick={() => { resetPipeline(); setPipeStatus('idle'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'none', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}
                  >
                    <RotateCcw size={11} /> Restart Analysis
                  </button>
                </>
              )}
              {pipeStatus === 'error' && (
                <button
                  onClick={() => { resetPipeline(); setPipeStatus('idle'); runPipeline(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#EF4444' }}
                >
                  <RotateCcw size={13} /> Retry Failed Stages
                </button>
              )}
            </div>
          )}
          {isRunning && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#F41C5E', fontWeight: 600 }}>
              <div className="animate-spin-slow" style={{ display: 'flex' }}><Loader size={14} /></div>
              AI agents running…
            </div>
          )}
        </div>
      )}

      {/* ── Vertical Pipeline ── */}
      {incident && (
        <div className="card animate-fade-up" style={{ overflow: 'hidden' }}>
          {STAGES.map((stage, i) => {
            const Icon     = stage.icon;
            const isFirst  = i === 0;
            const isLast   = i === STAGES.length - 1;
            const stageKey = stage.key as keyof typeof stages;
            const st       = isFirst ? { status: 'done' as const } : (stages[stageKey] ?? { status: 'pending' as const });

            const isDoneS    = st.status === 'done';
            const isRunningS = st.status === 'running';
            const isErrorS   = st.status === 'error';
            const isPending  = st.status === 'pending';

            const isClickable = isDoneS && stage.href;

            const dotColor = isDoneS    ? '#10B981'
                           : isRunningS ? stage.color
                           : isErrorS   ? '#EF4444'
                           : '#D1D5DB';

            const stageSummary = () => {
              if (stage.key === 'triage' && results.triage) {
                const t = results.triage;
                const n = t.similar_ticket_ids?.length ?? 0;
                return `${t.recommended_team}${t.recommended_engineer ? ` · ${t.recommended_engineer}` : ''} · ${Math.round(t.confidence * 100)}% conf${n > 0 ? ` · ${n} similar tickets` : ''}`;
              }
              if (stage.key === 'intelligence' && results.intelligence) {
                const c = results.intelligence.similar_tickets?.length ?? 0;
                const o = results.intelligence.correlated_open_tickets?.length ?? 0;
                return `${c} similar historical · ${o} correlated open`;
              }
              if (stage.key === 'irr' && results.irr) {
                const r = results.irr;
                return `${Math.round((r.confidence ?? 0) * 100)}% confidence${r.llm_recommendation?.estimated_resolution_time ? ` · Est. ${r.llm_recommendation.estimated_resolution_time}` : ''}`;
              }
              if (stage.key === 'resolver') return 'Awaiting human resolution notes';
              if (stage.key === 'dq')       return 'Quality validation check';
              return null;
            };

            return (
              <div key={stage.key} style={{ display: 'flex', gap: 0 }}>
                {/* Left: connector line + dot */}
                <div style={{ width: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  {/* Top line */}
                  <div style={{
                    width: 2, flex: isFirst ? '0 0 20px' : '0 0 16px',
                    background: isFirst ? 'transparent' : (isDoneS || isRunningS ? dotColor : '#E5E7EB'),
                    transition: 'background 0.4s ease',
                  }} />
                  {/* Dot */}
                  <div style={{
                    width: isDoneS ? 22 : isRunningS ? 24 : 18,
                    height: isDoneS ? 22 : isRunningS ? 24 : 18,
                    borderRadius: '50%',
                    background: isDoneS  ? '#10B981'
                               : isRunningS ? stage.color
                               : isErrorS ? '#EF4444'
                               : '#E5E7EB',
                    border: `2px solid ${isDoneS ? '#10B981' : isRunningS ? stage.color : isErrorS ? '#EF4444' : '#D1D5DB'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: isRunningS ? `0 0 0 5px ${stage.color}22` : 'none',
                    color: isDoneS || isRunningS || isErrorS ? '#fff' : '#9CA3AF',
                  }}>
                    {isDoneS    ? <CheckCircle size={12} />
                    : isRunningS ? <div className="animate-spin-slow" style={{ display: 'flex' }}><Loader size={11} /></div>
                    : isErrorS   ? <AlertCircle size={11} />
                    : <Icon size={10} />}
                  </div>
                  {/* Bottom line */}
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 16,
                      background: isDoneS ? dotColor : '#E5E7EB',
                      transition: 'background 0.4s ease',
                    }} />
                  )}
                </div>

                {/* Right: content */}
                <div style={{
                  flex: 1, padding: isLast ? '14px 20px 20px 8px' : '14px 20px 14px 8px',
                  borderBottom: isLast ? 'none' : '1px solid #F9FAFB',
                }}>
                  {isClickable ? (
                    <a
                      href={`${stage.href}?ticket=${incident.ticket_id}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      <StageContent
                        stage={stage} st={st} isDoneS={isDoneS} isRunningS={isRunningS}
                        isErrorS={isErrorS} isPending={isPending} summary={stageSummary()}
                        clickable
                        onRetry={(['triage','intelligence','irr'].includes(stage.key))
                          ? () => retryStage(stage.key as 'triage' | 'intelligence' | 'irr')
                          : undefined}
                      />
                    </a>
                  ) : (
                    <StageContent
                      stage={stage} st={st} isDoneS={isDoneS} isRunningS={isRunningS}
                      isErrorS={isErrorS} isPending={isPending} summary={stageSummary()}
                      clickable={false}
                      onRetry={(['triage','intelligence','irr'].includes(stage.key))
                        ? () => retryStage(stage.key as 'triage' | 'intelligence' | 'irr')
                        : undefined}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── No ticket yet ── */}
      {!incident && !loadError && (
        <div className="empty-state animate-fade-up">
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FFF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <GitBranchIcon />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>AI Pipeline Ready</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', maxWidth: 300, lineHeight: 1.6 }}>
            Load a ticket to orchestrate the full agent pipeline — triage, intelligence, and resolution in one guided flow.
          </div>
        </div>
      )}
    </div>
  );
}

function GitBranchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F41C5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 01-9 9"/>
    </svg>
  );
}

interface StageContentProps {
  stage:      typeof STAGES[0];
  st:         { status: string; durationMs?: number; confidence?: number; error?: string };
  isDoneS:    boolean;
  isRunningS: boolean;
  isErrorS:   boolean;
  isPending:  boolean;
  summary:    string | null;
  clickable:  boolean;
  onRetry?:   () => void;
}

function StageContent({ stage, st, isDoneS, isRunningS, isErrorS, isPending, summary, clickable, onRetry }: StageContentProps) {
  const Icon = stage.icon;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: isDoneS || isRunningS ? stage.bg : '#F9FAFB',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={13} color={isDoneS || isRunningS ? stage.color : '#9CA3AF'} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: isDoneS || isRunningS ? '#111827' : isPending ? '#9CA3AF' : '#111827' }}>
            {stage.label}
          </span>
        </div>

        {/* Subtext */}
        {isRunningS && stage.typing.length > 0 && (
          <AgentTyping messages={stage.typing} color={stage.color} fontSize={12} />
        )}
        {isDoneS && summary && (
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{summary}</div>
        )}
        {isErrorS && (
          <div style={{ fontSize: 12, color: '#EF4444' }}>{st.error ?? 'Agent failed'}</div>
        )}
        {isPending && (
          <div style={{ fontSize: 12, color: '#D1D5DB' }}>Waiting for previous stage</div>
        )}
        {stage.key === 'received' && (
          <div style={{ fontSize: 12, color: '#6B7280' }}>Ticket loaded and verified</div>
        )}
      </div>

      {/* Right meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {isDoneS && st.durationMs && (
          <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} />{(st.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {isDoneS && st.confidence !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, color: st.confidence >= 0.7 ? '#059669' : '#D97706', background: st.confidence >= 0.7 ? '#ECFDF5' : '#FFFBEB', padding: '2px 8px', borderRadius: 20 }}>
            {Math.round(st.confidence * 100)}%
          </span>
        )}
        {isDoneS && clickable && (
          <span style={{ fontSize: 11, fontWeight: 600, color: stage.color, display: 'flex', alignItems: 'center', gap: 3 }}>
            View <ArrowRight size={10} />
          </span>
        )}
        {isErrorS && onRetry && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onRetry(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '4px 9px', cursor: 'pointer' }}
          >
            <RotateCcw size={10} /> Retry
          </button>
        )}
        {isPending && stage.key !== 'received' && (
          <span style={{ fontSize: 10, color: '#D1D5DB', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>pending</span>
        )}
        {isRunningS && (
          <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>running</span>
        )}
      </div>
    </div>
  );
}
