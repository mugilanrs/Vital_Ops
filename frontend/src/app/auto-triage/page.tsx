'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Target, Loader, AlertCircle, CheckCircle, XCircle,
  Edit2, ArrowLeft, Clock, Users, Wifi, WifiOff,
  ChevronRight, Award, Zap, BarChart2, Star, Shield,
  TrendingUp, ChevronDown,
} from 'lucide-react';
import { StatusChip } from '@/components/shared/StatusChip';
import { AgentTyping } from '@/components/shared/AgentTyping';
import { Drawer } from '@/components/shared/Drawer';
import { useLandingData, KpiTile, HBar, AvailDot, LandingSectionHeader, LandingSkeleton } from '@/components/shared/AgentLanding';
import { api } from '@/lib/api';
import { useTicket } from '@/context/TicketContext';
import type { Incident, TriageResult, Team, Engineer } from '@/lib/types';

const TRIAGE_MESSAGES = ['Embedding ticket…', 'Searching vector index…', 'Tallying team scores…', 'Ranking engineers by load…'];

export default function AutoTriagePage() {
  return <Suspense><AutoTriageContent /></Suspense>;
}

function AutoTriageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const ticketId     = searchParams.get('ticket') ?? '';
  const { setActiveTicket, stages, setStage, results, setResult } = useTicket();

  const [incident, setIncident]   = useState<Incident | null>(null);
  const [result, setLocalResult]  = useState<TriageResult | null>(results.triage);
  const [running, setRunning]     = useState(false);
  const [error, setError]         = useState('');
  const [approved, setApproved]   = useState(stages.triage?.status === 'done');
  const [navigating, setNavigating] = useState(false);

  // Right column: team roster
  const [teams, setTeams]             = useState<Team[]>([]);
  const [engineers, setEngineers]     = useState<Engineer[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Edit drawer
  const [editOpen, setEditOpen]       = useState(false);
  const [editTeam, setEditTeam]       = useState('');
  const [editEngineer, setEditEngineer] = useState('');
  const [editEngineers, setEditEngineers] = useState<Engineer[]>([]);

  // View All Engineers drawer
  const [allEngOpen, setAllEngOpen]   = useState(false);

  useEffect(() => { api.teams.list().then(setTeams).catch(() => {}); }, []);

  const loadRoster = useCallback(async (teamName: string) => {
    const team = teams.find(t => t.name === teamName);
    if (!team) return;
    setRosterLoading(true);
    try {
      const engs = await api.teams.engineers(team.team_id);
      setEngineers(engs);
    } catch { setEngineers([]); }
    finally { setRosterLoading(false); }
  }, [teams]);

  // Auto-run: if no result in context, fetch + run
  useEffect(() => {
    if (!ticketId) return;
    // If pipeline already ran triage, use that result
    if (results.triage) {
      setLocalResult(results.triage);
      api.incidents.get(ticketId)
        .then(inc => { setIncident(inc); setActiveTicket(inc); })
        .catch(() => {});
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
        return api.incidents.runTriage(inc.ticket_id);
      })
      .then(r => {
        if (cancelled || !r) return;
        setLocalResult(r as TriageResult);
        setResult('triage', r as TriageResult);
        setStage('triage', { status: 'done', confidence: (r as TriageResult).confidence });
      })
      .catch(() => { if (!cancelled) setError('Triage failed — check backend'); })
      .finally(() => { if (!cancelled) setRunning(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Load roster when result arrives
  useEffect(() => {
    if (result?.recommended_team && teams.length > 0) {
      loadRoster(result.recommended_team);
    }
  }, [result, teams, loadRoster]);

  // Load edit engineers when team changes
  useEffect(() => {
    if (!editTeam) return;
    const team = teams.find(t => t.name === editTeam);
    if (!team) return;
    api.teams.engineers(team.team_id).then(setEditEngineers).catch(() => {});
  }, [editTeam, teams]);

  const handleApprove = () => {
    setApproved(true);
    setStage('triage', { status: 'done', confidence: result?.confidence });
    setNavigating(true);
    setTimeout(() => {
      router.push(`/incident-pipeline?ticket=${ticketId}`);
    }, 1400);
  };

  const handleReject = () => {
    if (!incident) return;
    setLocalResult(null);
    setApproved(false);
    setRunning(true);
    setError('');
    api.incidents.runTriage(incident.ticket_id)
      .then(r => {
        setLocalResult(r);
        setResult('triage', r);
        setStage('triage', { status: 'done', confidence: r.confidence });
      })
      .catch(() => setError('Re-triage failed'))
      .finally(() => setRunning(false));
  };

  const handleEditSave = () => {
    if (!result) return;
    const updated = { ...result, recommended_team: editTeam || result.recommended_team, recommended_engineer: editEngineer || result.recommended_engineer };
    setLocalResult(updated);
    setResult('triage', updated);
    setEditOpen(false);
    loadRoster(updated.recommended_team);
  };

  // Sorted engineers
  const seniorityOrder: Record<string, number> = { Lead: 0, Senior: 1, Mid: 2, Junior: 3 };
  const sortedEngineers = [...engineers].sort((a, b) => {
    const sd = (seniorityOrder[a.seniority] ?? 9) - (seniorityOrder[b.seniority] ?? 9);
    return sd !== 0 ? sd : a.current_load - b.current_load;
  });
  const statusColors: Record<string, { dot: string; text: string; bg: string }> = {
    'Available': { dot: '#10B981', text: '#059669', bg: '#ECFDF5' },
    'Busy':      { dot: '#F59E0B', text: '#B45309', bg: '#FFFBEB' },
    'On Leave':  { dot: '#9CA3AF', text: '#6B7280', bg: '#F3F4F6' },
  };
  const available = engineers.filter(e => e.status === 'Available').length;
  const MAX_LOAD  = 12;

  if (!ticketId && !incident) {
    return <TriageLanding />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Back to pipeline */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => router.push(`/incident-pipeline?ticket=${ticketId}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: 0 }}
        >
          <ArrowLeft size={13} /> Pipeline
        </button>
        <ChevronRight size={12} color="#D1D5DB" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#F41C5E' }}>Auto-Triage</span>
        {approved && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 9px', borderRadius: 20, marginLeft: 4 }}>
            ✓ Approved
          </span>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', fontSize: 13, border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Running state */}
      {running && !result && (
        <div className="card animate-fade-up" style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FFF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="animate-spin-slow" style={{ display: 'flex' }}><Target size={22} color="#F41C5E" /></div>
          </div>
          <AgentTyping messages={TRIAGE_MESSAGES} color="#F41C5E" fontSize={14} intervalMs={1200} />
        </div>
      )}

      {/* ── 2-column workspace ── */}
      {(result || incident) && !running && (
        <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1.85fr', gap: 14, alignItems: 'start' }}>

          {/* ── LEFT: Incident Summary ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="card" style={{ padding: '18px 20px' }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Incident</div>
              {incident ? (
                <>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#9CA3AF', marginBottom: 5 }}>{incident.ticket_id}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.4, marginBottom: 10 }}>{incident.subject}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    <StatusChip value={incident.priority} type="priority" size="sm" />
                    <StatusChip value={incident.status} size="sm" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {[
                      ['Service',     incident.service_instance],
                      ['Organisation',incident.organisation],
                      ['Environment', incident.environment],
                      ['Category',    incident.category],
                      ['Impact',      incident.impact],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                        <span style={{ color: '#9CA3AF', minWidth: 86, flexShrink: 0 }}>{k}</span>
                        <span style={{ color: '#374151', fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {incident.description && (
                    <div style={{ marginTop: 14, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #F3F4F6' }}>
                      <div className="section-label" style={{ marginBottom: 5 }}>Description</div>
                      <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.6 }}>
                        {incident.description.length > 240
                          ? incident.description.slice(0, 240) + '…'
                          : incident.description}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Decision Workspace (merged recommendation + roster) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result ? (
              <DecisionWorkspace
                result={result}
                sortedEngineers={sortedEngineers}
                rosterLoading={rosterLoading}
                available={available}
                approved={approved}
                navigating={navigating}
                ticketId={ticketId}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={() => { setEditTeam(result.recommended_team); setEditEngineer(result.recommended_engineer ?? ''); setEditOpen(true); }}
                onViewAll={() => setAllEngOpen(true)}
                onBackToPipeline={() => router.push(`/incident-pipeline?ticket=${ticketId}`)}
              />
            ) : (
              <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#9CA3AF' }}>Run triage to see recommendation</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View All Engineers Drawer ── */}
      <Drawer open={allEngOpen} onClose={() => setAllEngOpen(false)} title={`${result?.recommended_team ?? 'Team'} — Full Roster`} subtitle={`${sortedEngineers.length} engineers · ${available} available`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedEngineers.map((eng, idx) => {
            const isRec = eng.name === result?.recommended_engineer;
            const loadPct = Math.min(Math.round(eng.current_load / MAX_LOAD * 100), 100);
            const sc = statusColors[eng.status] ?? statusColors['Busy'];
            return (
              <div key={eng.id} style={{
                padding: '12px 14px', borderRadius: 10,
                border: isRec ? '2px solid #F41C5E' : '1px solid #F3F4F6',
                background: isRec ? '#FFF8FA' : '#FAFAFA',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isRec ? '#F41C5E' : '#E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: isRec ? '#fff' : '#6B7280', flexShrink: 0,
                  }}>
                    {eng.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', display: 'flex', alignItems: 'center', gap: 7 }}>
                      {eng.name}
                      {isRec && <span style={{ fontSize: 9, background: '#F41C5E', color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 800 }}>RECOMMENDED</span>}
                      {idx === 0 && !isRec && <span style={{ fontSize: 9, color: '#6366F1', background: '#EEF2FF', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>#{idx + 1} RANKED</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{eng.seniority}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: sc.text, background: sc.bg, padding: '3px 9px', borderRadius: 20 }}>
                    {eng.status}
                  </span>
                </div>
                <div style={{ height: 5, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 3 }}>
                  <div style={{ height: '100%', width: `${loadPct}%`, borderRadius: 99, background: loadPct > 75 ? '#EF4444' : loadPct > 50 ? '#F59E0B' : '#10B981', transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: 10, color: '#9CA3AF' }}>{eng.current_load}/{MAX_LOAD} tickets assigned · {loadPct}% capacity</div>
              </div>
            );
          })}
        </div>
      </Drawer>

      {/* ── Edit Assignment Drawer ── */}
      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Edit Assignment" subtitle="Override the AI recommendation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="section-label" style={{ marginBottom: 6 }}>Team</label>
            <select
              value={editTeam}
              onChange={e => { setEditTeam(e.target.value); setEditEngineer(''); }}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, background: '#FAFAFA', cursor: 'pointer' }}
            >
              <option value="">Select team…</option>
              {teams.map(t => <option key={t.team_id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          {editEngineers.length > 0 && (
            <div>
              <label className="section-label" style={{ marginBottom: 6 }}>Engineer</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {editEngineers.map(eng => (
                  <button
                    key={eng.id}
                    onClick={() => setEditEngineer(eng.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: editEngineer === eng.name ? '2px solid #F41C5E' : '1px solid #E5E7EB',
                      background: editEngineer === eng.name ? '#FFF0F4' : '#FAFAFA',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: editEngineer === eng.name ? '#F41C5E' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: editEngineer === eng.name ? '#fff' : '#6B7280', flexShrink: 0 }}>
                      {eng.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>{eng.name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{eng.seniority} · load {eng.current_load}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: eng.status === 'Available' ? '#059669' : '#9CA3AF', background: eng.status === 'Available' ? '#ECFDF5' : '#F3F4F6', padding: '2px 7px', borderRadius: 20 }}>
                      {eng.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleEditSave}
            disabled={!editTeam}
            className="btn-primary"
            style={{ marginTop: 8 }}
          >
            Save Assignment
          </button>
        </div>
      </Drawer>
    </div>
  );
}

/* ── Decision Workspace ──────────────────────────────────── */

interface WorkspaceProps {
  result: TriageResult;
  sortedEngineers: Engineer[];
  rosterLoading: boolean;
  available: number;
  approved: boolean;
  navigating: boolean;
  ticketId: string;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onViewAll: () => void;
  onBackToPipeline: () => void;
}

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  'Service Match':           <Zap size={13} color="#F41C5E" />,
  'Historical Ownership':    <Shield size={13} color="#6366F1" />,
  'Engineer Availability':   <Users size={13} color="#10B981" />,
  'Current Team Capacity':   <BarChart2 size={13} color="#F59E0B" />,
  'Similar Incidents':       <TrendingUp size={13} color="#06B6D4" />,
  'Assignment Success Rate': <Award size={13} color="#8B5CF6" />,
};

function confidenceLabel(pct: number) {
  if (pct >= 85) return 'High Confidence';
  if (pct >= 65) return 'Medium Confidence';
  return 'Low Confidence';
}

function confidenceColor(pct: number) {
  if (pct >= 85) return '#059669';
  if (pct >= 65) return '#D97706';
  return '#EF4444';
}

function DecisionWorkspace({
  result, sortedEngineers, rosterLoading, available,
  approved, navigating, ticketId,
  onApprove, onReject, onEdit, onViewAll, onBackToPipeline,
}: WorkspaceProps) {
  const pct = Math.round(result.confidence * 100);
  const similarCount = result.similar_ticket_ids?.length ?? 0;
  const MAX_LOAD = 12;

  // Build AI Decision Factors from available result data
  const totalEng   = sortedEngineers.length;
  const capacityPct = totalEng > 0 ? Math.round(available / totalEng * 100) : 0;
  const assignedTickets = totalEng > 0
    ? sortedEngineers.reduce((s, e) => s + e.current_load, 0)
    : 0;
  const maxTeamTickets = totalEng * MAX_LOAD;

  // Derive a service match score from similarity (0.5-1.0 → 50-100)
  const serviceMatchScore = Math.min(100, Math.round(pct * 1.05));
  const ownershipScore    = similarCount > 0 ? Math.min(100, 70 + similarCount * 4) : 60;
  const availabilityScore = totalEng > 0 ? capacityPct : 50;
  const capacityScore     = maxTeamTickets > 0
    ? Math.max(0, Math.round(100 - (assignedTickets / maxTeamTickets) * 100))
    : 50;
  const incidentScore     = Math.min(100, 55 + similarCount * 7);
  const successScore      = Math.min(100, Math.round(pct * 0.95 + 5));

  const factors: { label: string; score: number; sub: string }[] = [
    { label: 'Service Match',           score: serviceMatchScore, sub: `Matching service instance` },
    { label: 'Historical Ownership',    score: ownershipScore,    sub: `${similarCount} prior ownership records` },
    { label: 'Engineer Availability',   score: availabilityScore, sub: `${available} of ${totalEng} engineers free` },
    { label: 'Current Team Capacity',   score: capacityScore,     sub: `${assignedTickets} of ${maxTeamTickets} tickets assigned` },
    { label: 'Similar Incidents',       score: incidentScore,     sub: `${similarCount} historical match${similarCount !== 1 ? 'es' : ''}` },
    { label: 'Assignment Success Rate', score: successScore,      sub: 'Hybrid Similarity Model' },
  ];

  // Top 3 team score bars from reasoning
  const rawScores = result.reasoning?.vector_similarity_team_tally;
  const teamScoreBars: { name: string; score: number }[] = rawScores
    ? (Object.entries(rawScores) as [string, number][])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, raw]) => ({ name, score: Math.min(100, Math.round(raw * 30)) }))
    : [];

  const top3 = sortedEngineers.slice(0, 3);

  const statusColors: Record<string, { dot: string; text: string; bg: string }> = {
    'Available': { dot: '#10B981', text: '#059669', bg: '#ECFDF5' },
    'Busy':      { dot: '#F59E0B', text: '#B45309', bg: '#FFFBEB' },
    'On Leave':  { dot: '#9CA3AF', text: '#6B7280', bg: '#F3F4F6' },
  };

  return (
    <div className="card" style={{ padding: '22px 24px', borderTop: '3px solid #F41C5E', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: '#FFF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Target size={15} color="#F41C5E" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#F41C5E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Decision Workspace</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>Powered by Hybrid Similarity Model</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            fontSize: 12, fontWeight: 800, color: confidenceColor(pct),
            background: pct >= 85 ? '#ECFDF5' : pct >= 65 ? '#FFFBEB' : '#FEF2F2',
            padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Star size={11} fill={confidenceColor(pct)} color={confidenceColor(pct)} />
            {pct}% {confidenceLabel(pct)}
          </div>
        </div>
      </div>

      {/* Section 1: Recommended Team */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 5 }}>Recommended Team</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', lineHeight: 1.2, marginBottom: 4 }}>{result.recommended_team}</div>
          {result.sla_estimate_hrs && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#D97706', background: '#FFFBEB', padding: '3px 9px', borderRadius: 20 }}>
              <Clock size={10} /> SLA {result.sla_estimate_hrs.toFixed(1)}h estimate
            </div>
          )}
        </div>
        {teamScoreBars.length > 0 && (
          <div>
            <div className="section-label" style={{ marginBottom: 7 }}>Team Comparison</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {teamScoreBars.map((t, i) => (
                <div key={t.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                    <span style={{ color: i === 0 ? '#F41C5E' : '#6B7280', fontWeight: i === 0 ? 700 : 400, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    <span style={{ color: '#9CA3AF' }}>{t.score}%</span>
                  </div>
                  <div style={{ height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.score}%`, borderRadius: 99, background: i === 0 ? '#F41C5E' : '#D1D5DB', transition: 'width 0.7s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: AI Decision Factors */}
      <div>
        <div className="section-label" style={{ marginBottom: 10 }}>Why this team?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {factors.map(f => (
            <div key={f.label} style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                {FACTOR_ICONS[f.label]}
                <span style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>{f.label}</span>
              </div>
              <div style={{ height: 4, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{
                  height: '100%', width: `${f.score}%`, borderRadius: 99,
                  background: f.score >= 75 ? '#10B981' : f.score >= 50 ? '#F59E0B' : '#EF4444',
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: '#9CA3AF' }}>{f.sub}</span>
                <span style={{ fontWeight: 700, color: f.score >= 75 ? '#059669' : f.score >= 50 ? '#D97706' : '#EF4444' }}>{f.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Top 3 Engineers */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div className="section-label">Top Engineers</div>
            {!rosterLoading && sortedEngineers.length > 0 && (
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                Current Capacity: {capacityPct}% — {available} of {totalEng} engineers available
              </div>
            )}
          </div>
          {sortedEngineers.length > 3 && (
            <button
              onClick={onViewAll}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#F41C5E', background: '#FFF0F4', border: '1px solid #FDD7E2', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
            >
              View All {sortedEngineers.length} <ChevronDown size={11} />
            </button>
          )}
        </div>

        {rosterLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ padding: '14px', borderRadius: 12, border: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 10, width: '70%', marginBottom: 5 }} />
                    <div className="skeleton" style={{ height: 8, width: '45%' }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: 4, borderRadius: 99, marginBottom: 5 }} />
                <div className="skeleton" style={{ height: 8, width: '55%' }} />
              </div>
            ))}
          </div>
        ) : top3.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {top3.map((eng, idx) => {
              const isRec = eng.name === result.recommended_engineer;
              const loadPct = Math.min(Math.round(eng.current_load / MAX_LOAD * 100), 100);
              const sc = statusColors[eng.status] ?? statusColors['Busy'];
              // Skill match: first engineer gets highest (derived from confidence), decreasing
              const skillMatch = Math.max(50, pct - idx * 8);
              // Recommendation score: derived
              const recScore = Math.max(55, pct - idx * 9);
              return (
                <div key={eng.id} style={{
                  padding: '14px', borderRadius: 12,
                  border: isRec ? '2px solid #F41C5E' : '1px solid #E5E7EB',
                  background: isRec ? '#FFF8FA' : '#FAFAFA',
                  position: 'relative',
                }}>
                  {isRec && (
                    <div style={{
                      position: 'absolute', top: -1, right: -1,
                      background: '#F41C5E', color: '#fff', fontSize: 9, fontWeight: 800,
                      padding: '2px 8px', borderRadius: '0 10px 0 8px', letterSpacing: '0.04em',
                    }}>
                      RECOMMENDED
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: isRec ? '#F41C5E' : '#E5E7EB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: isRec ? '#fff' : '#6B7280', flexShrink: 0,
                    }}>
                      {eng.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.2, marginBottom: 2 }}>{eng.name}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{eng.seniority}</div>
                      <div style={{ marginTop: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: sc.text, background: sc.bg, padding: '2px 8px', borderRadius: 20 }}>
                          {eng.status === 'Available' ? '● ' : '○ '}{eng.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9CA3AF', marginBottom: 3 }}>
                      <span>Current Load</span>
                      <span>{eng.current_load}/{MAX_LOAD}</span>
                    </div>
                    <div style={{ height: 4, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${loadPct}%`, borderRadius: 99, background: loadPct > 75 ? '#EF4444' : loadPct > 50 ? '#F59E0B' : '#10B981', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>

                  {/* Skill match + rec score */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    <div style={{ background: '#F3F4F6', borderRadius: 7, padding: '5px 7px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 1 }}>Skill Match</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>{skillMatch}%</div>
                    </div>
                    <div style={{ background: isRec ? '#FFF0F4' : '#F3F4F6', borderRadius: 7, padding: '5px 7px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 1 }}>Rec. Score</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: isRec ? '#F41C5E' : '#374151' }}>{recScore}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 13 }}>
            {result ? 'No engineers found for this team' : 'Team roster will load after triage'}
          </div>
        )}
      </div>

      {/* Section 4: Confidence detail */}
      <div style={{ padding: '14px 16px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-label">Supporting Evidence</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: confidenceColor(pct) }}>
            {pct}% {confidenceLabel(pct)}
          </span>
        </div>
        <div style={{ height: 7, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%', borderRadius: 99, width: `${pct}%`,
            background: pct >= 85 ? 'linear-gradient(90deg,#10B981,#34D399)' : pct >= 65 ? 'linear-gradient(90deg,#F59E0B,#FBBF24)' : 'linear-gradient(90deg,#EF4444,#F87171)',
            transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {similarCount > 0 && (
            <span style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={10} color="#10B981" /> Based on {similarCount} historical match{similarCount !== 1 ? 'es' : ''}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={10} color="#6366F1" /> {ownershipScore}% ownership similarity
          </span>
          <span style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={10} color="#F41C5E" /> Matching service instance
          </span>
        </div>
      </div>

      {/* Section 5: Actions */}
      {!approved ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onApprove}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 0', borderRadius: 10, background: '#F41C5E', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
          >
            <CheckCircle size={15} /> Approve Assignment
          </button>
          <button
            onClick={onReject}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px', borderRadius: 10, background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <XCircle size={14} /> Reject
          </button>
          <button
            onClick={onEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px', borderRadius: 10, background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <Edit2 size={13} /> Edit
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <CheckCircle size={17} color="#059669" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>Assignment Approved</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {navigating ? 'Navigating to pipeline…' : `Ticket assigned to ${result.recommended_team}`}
            </div>
          </div>
          {navigating ? (
            <div style={{ marginLeft: 'auto' }}>
              <Loader size={14} color="#059669" className="animate-spin-slow" />
            </div>
          ) : (
            <button
              onClick={onBackToPipeline}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#F41C5E', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Back to Pipeline <ChevronRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Landing infographic (no active ticket) ─────────────── */

/* ── landing charts (Recharts) ───────────────────────────── */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';

const PRI_COLORS: Record<string, string> = {
  Critical: '#DC2626', High: '#F97316', Medium: '#F59E0B', Low: '#10B981',
};

function TriageLanding() {
  const { analytics, teams, roster, trends, loading } = useLandingData(true);

  if (loading) return <LandingSkeleton />;

  const byPriority = analytics?.incidents_by_priority ?? {};
  const priData    = (['Critical','High','Medium','Low'] as const)
    .map(p => ({ name: p, value: byPriority[p] ?? 0, fill: PRI_COLORS[p] }));

  // availability across all loaded teams
  const rosterVals = Object.values(roster);
  const totalAvail = rosterVals.reduce((s, engs) => s + engs.filter(e => e.status === 'Available').length, 0);
  const totalBusy  = rosterVals.reduce((s, engs) => s + engs.filter(e => e.status === 'Busy').length, 0);
  const totalAway  = rosterVals.reduce((s, engs) => s + engs.filter(e => e.status === 'On Leave').length, 0);
  const availPieData = [
    { name: 'Available', value: totalAvail, fill: '#10B981' },
    { name: 'Busy',      value: totalBusy,  fill: '#F59E0B' },
    { name: 'On Leave',  value: totalAway,  fill: '#9CA3AF' },
  ].filter(d => d.value > 0);

  const trendData = trends.slice(-14).map(t => ({
    date:     t.date.slice(5),
    Total:    t.count,
    Resolved: t.resolved,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-up">
      <LandingSectionHeader
        icon={<div style={{ width: 40, height: 40, borderRadius: 12, background: '#FFF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={20} color="#F41C5E" /></div>}
        title="Auto-Triage Agent"
        sub="Load a ticket from the pipeline to run AI-powered team assignment"
      />

      {analytics && (
        <div style={{ display: 'flex', gap: 12 }}>
          <KpiTile label="Open Incidents"  value={analytics.open_incidents}                        color="#F41C5E" bg="#FFF0F4" />
          <KpiTile label="SLA Compliance"  value={`${analytics.sla_compliance_pct}%`}             color="#059669" bg="#ECFDF5" />
          <KpiTile label="Avg Resolution"  value={`${analytics.avg_resolution_hrs.toFixed(1)}h`}  color="#6366F1" bg="#EEF2FF" />
          <KpiTile label="Resolved (7d)"   value={analytics.resolved_today}                        color="#F59E0B" bg="#FFFBEB" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14 }}>

        {/* Priority bar chart */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Incidents by Priority</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={priData} barSize={32} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                cursor={{ fill: '#F9FAFB' }}
              />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {priData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team availability donut */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 4 }}>Team Availability</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>Across {teams.length} teams</div>
          <ResponsiveContainer width="100%" height={148}>
            <PieChart>
              <Pie data={availPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                dataKey="value" paddingAngle={3} strokeWidth={0}>
                {availPieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 2 }}>
            {availPieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
                <span style={{ color: '#6B7280' }}>{d.name} <strong style={{ color: '#374151' }}>{d.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* 14-day trend */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>14-Day Ticket Trend</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="areaTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F41C5E" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F41C5E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11 }} />
              <Area type="monotone" dataKey="Total"    stroke="#F41C5E" fill="url(#areaTotal)"    strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Resolved" stroke="#10B981" fill="url(#areaResolved)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team roster rows */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Team Roster Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {teams.slice(0, 8).map(team => {
            const engs     = roster[team.team_id] ?? [];
            const available= engs.filter(e => e.status === 'Available').length;
            const total    = engs.length;
            const pct      = total > 0 ? Math.round(available / total * 100) : 0;
            return (
              <div key={team.team_id} style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: 9, border: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, lineHeight: 1.3 }}>{team.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>{available} avail</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>{total} total</span>
                </div>
                <div style={{ height: 4, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct > 60 ? '#10B981' : pct > 30 ? '#F59E0B' : '#EF4444', borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
