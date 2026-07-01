'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusChip } from '@/components/shared/StatusChip';
import { api } from '@/lib/api';
import { useSSE } from '@/hooks/useSSE';
import type { Incident } from '@/lib/types';

type Tab = 'live' | 'historical';

export default function TicketsPage() {
  const [tab, setTab] = useState<Tab>('live');
  const [liveTickets, setLiveTickets] = useState<Incident[]>([]);
  const [items, setItems] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const PAGE_SIZE = 20;

  useSSE((type, data) => {
    if (type === 'incident_received') {
      api.incidents
        .get(data.ticket_id as string)
        .then((inc) => setLiveTickets((prev) => [inc, ...prev]))
        .catch(() => {});
    }
  });

  // Load live tickets once
  useEffect(() => {
    api.incidents.list({ is_live: true, page_size: 50 }).then((r) => setLiveTickets(r.items)).catch(console.error);
  }, []);

  // Load historical tickets
  useEffect(() => {
    if (tab !== 'historical') return;
    setLoading(true);
    api.incidents
      .list({
        is_live: false,
        search: search || undefined,
        priority: priorityFilter || undefined,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab, page, search, priorityFilter, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {(['live', 'historical'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            style={{
              padding: '8px 20px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#0A0A0A' : '#6B7280',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'live' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: tab === 'live' ? 'pulse-dot 1.5s infinite' : 'none' }} />
                Live
                {liveTickets.length > 0 && (
                  <span style={{ background: '#F41C5E', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px' }}>
                    {liveTickets.length}
                  </span>
                )}
              </span>
            ) : 'Historical (50K)'}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #EAECF0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', fontWeight: 700, fontSize: 14 }}>
            Live Tickets
          </div>
          {liveTickets.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
              No live tickets yet. Submit one from the trigger app.
            </div>
          ) : (
            <TicketTable tickets={liveTickets} />
          )}
        </div>
      )}

      {tab === 'historical' && (
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #EAECF0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Filters */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #EAECF0',
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#F7F8FA',
                borderRadius: 10,
                padding: '7px 12px',
                flex: 1,
                minWidth: 200,
              }}
            >
              <Search size={14} color="#9CA3AF" />
              <input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 13,
                  color: '#0A0A0A',
                  width: '100%',
                }}
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              style={{
                padding: '7px 12px',
                borderRadius: 10,
                border: '1px solid #EAECF0',
                fontSize: 13,
                color: '#0A0A0A',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="">All priorities</option>
              {['Top', 'High', 'Medium', 'Low'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{
                padding: '7px 12px',
                borderRadius: 10,
                border: '1px solid #EAECF0',
                fontSize: 13,
                color: '#0A0A0A',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="">All statuses</option>
              {['New', 'In Progress', 'Resolved', 'Closed', 'Cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
              {total.toLocaleString()} total
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>
          ) : (
            <TicketTable tickets={items} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #EAECF0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <span style={{ color: '#6B7280' }}>
                Page {page} of {totalPages.toLocaleString()}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #EAECF0',
                    background: '#fff',
                    cursor: page <= 1 ? 'default' : 'pointer',
                    opacity: page <= 1 ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #EAECF0',
                    background: '#fff',
                    cursor: page >= totalPages ? 'default' : 'pointer',
                    opacity: page >= totalPages ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TicketTable({ tickets }: { tickets: Incident[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#F9FAFB' }}>
          {['Ticket ID', 'Subject', 'Service', 'Priority', 'Status', 'Created', ''].map((h) => (
            <th
              key={h}
              style={{
                padding: '10px 20px',
                textAlign: 'left',
                fontSize: 11,
                fontWeight: 600,
                color: '#9CA3AF',
                letterSpacing: '0.04em',
                borderBottom: '1px solid #EAECF0',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tickets.map((inc) => (
          <tr
            key={inc.id}
            style={{ borderBottom: '1px solid #F9FAFB' }}
          >
            <td style={{ padding: '12px 20px' }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#6B7280' }}>
                {inc.ticket_id}
              </span>
            </td>
            <td style={{ padding: '12px 20px', maxWidth: 320 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0A0A0A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {inc.subject}
              </div>
              {inc.assigned_team && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{inc.assigned_team}</div>
              )}
            </td>
            <td style={{ padding: '12px 20px' }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{inc.service_instance}</span>
            </td>
            <td style={{ padding: '12px 20px' }}>
              <StatusChip value={inc.priority} type="priority" />
            </td>
            <td style={{ padding: '12px 20px' }}>
              <StatusChip value={inc.status} />
            </td>
            <td style={{ padding: '12px 20px' }}>
              <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-mono)' }}>
                {new Date(inc.created_at).toLocaleDateString()}
              </span>
            </td>
            <td style={{ padding: '12px 20px' }}>
              <Link
                href={`/incident-pipeline?ticket=${inc.ticket_id}`}
                style={{
                  fontSize: 12,
                  color: '#F41C5E',
                  textDecoration: 'none',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Run Pipeline →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
