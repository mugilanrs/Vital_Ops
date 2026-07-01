'use client';

import Link from 'next/link';
import { X, CheckCircle, Clock, Users } from 'lucide-react';
import { useTicket } from '@/context/TicketContext';
import { StatusChip } from '@/components/shared/StatusChip';

const STAGE_KEYS  = ['triage', 'intelligence', 'irr', 'resolver', 'dq'] as const;
const STAGE_LABELS: Record<string, string> = {
  triage:       'Triage',
  intelligence: 'Intelligence',
  irr:          'IRR',
  resolver:     'Resolver',
  dq:           'DQ',
};
const STAGE_HREFS: Record<string, string> = {
  triage:       '/auto-triage',
  intelligence: '/incident-intelligence',
  irr:          '/irr-agent',
  resolver:     '/human-resolver',
  dq:           '/dq-agent',
};

export function IncidentBar() {
  const { activeTicket, clearTicket, stages, results } = useTicket();
  if (!activeTicket) return null;

  const triage = results.triage;
  const team   = triage?.recommended_team;
  const sla    = triage?.sla_estimate_hrs;

  return (
    <div style={{
      height: 64,
      background: '#fff',
      borderBottom: '1px solid #ECEEF2',
      padding: '0 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      position: 'sticky', top: 0, zIndex: 30,
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      flexShrink: 0,
    }}>
      {/* Ticket identity */}
      <Link
        href={`/incident-pipeline?ticket=${activeTicket.ticket_id}`}
        style={{ display: 'flex', flexDirection: 'column', gap: 2, textDecoration: 'none', flexShrink: 0 }}
      >
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#9CA3AF' }}>
          {activeTicket.ticket_id}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeTicket.subject}
        </span>
      </Link>

      {/* Chips */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        <StatusChip value={activeTicket.priority} type="priority" size="sm" />
        <StatusChip value={activeTicket.status} size="sm" />
      </div>

      {/* Team + SLA context (from triage result) */}
      {team && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: '#FFF0F4', border: '1px solid #FDD7E2',
          borderRadius: 20, padding: '3px 10px', flexShrink: 0,
        }}>
          <Users size={11} color="#F41C5E" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#F41C5E' }}>{team}</span>
        </div>
      )}
      {sla != null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 20, padding: '3px 10px', flexShrink: 0,
        }}>
          <Clock size={11} color="#B45309" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309' }}>{sla.toFixed(1)}h SLA</span>
        </div>
      )}

      {/* Named stepper — centre-aligned, fills remaining space */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, minWidth: 0 }}>
        {STAGE_KEYS.map((k, i) => {
          const st      = stages[k]?.status ?? 'pending';
          const isDone  = st === 'done';
          const isRun   = st === 'running';
          const isPend  = st === 'pending';
          const ticketPart = `?ticket=${activeTicket.ticket_id}`;

          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Connector line before (except first) */}
              {i > 0 && (
                <div style={{
                  width: 24, height: 2,
                  background: isDone || isRun ? '#10B981' : '#E5E7EB',
                  transition: 'background 0.3s',
                  flexShrink: 0,
                }} />
              )}

              {/* Step node */}
              <Link
                href={`${STAGE_HREFS[k]}${ticketPart}`}
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}
              >
                {/* Dot */}
                <div style={{
                  width: isDone ? 18 : isRun ? 16 : 14,
                  height: isDone ? 18 : isRun ? 16 : 14,
                  borderRadius: '50%',
                  background: isDone ? '#10B981' : isRun ? '#F41C5E' : '#E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: isRun ? '0 0 0 3px rgba(244,28,94,0.2)' : 'none',
                  animation: isRun ? 'glow-pulse 2s ease-in-out infinite' : 'none',
                }}>
                  {isDone && <CheckCircle size={11} color="#fff" strokeWidth={2.5} />}
                </div>
                {/* Label */}
                <span style={{
                  fontSize: 10, fontWeight: isDone || isRun ? 700 : 500,
                  color: isDone ? '#059669' : isRun ? '#F41C5E' : '#9CA3AF',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.2s',
                }}>
                  {STAGE_LABELS[k]}
                </span>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Exit */}
      <button
        onClick={clearTicket}
        style={{
          background: 'none', border: '1px solid #E5E7EB',
          borderRadius: 8, padding: '5px 10px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, color: '#9CA3AF', flexShrink: 0,
          transition: 'color 0.12s, border-color 0.12s',
        }}
      >
        <X size={12} /> Exit
      </button>
    </div>
  );
}
