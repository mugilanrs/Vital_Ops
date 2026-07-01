'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTicket } from '@/context/TicketContext';
import type { Incident } from '@/lib/types';

export function useTicketLoader() {
  const searchParams = useSearchParams();
  const urlTicketId = searchParams.get('ticket') ?? '';
  const { activeTicket, setActiveTicket } = useTicket();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resolve: prefer URL param, fall back to context
  const ticketId = urlTicketId || activeTicket?.ticket_id || '';

  useEffect(() => {
    if (!ticketId) return;
    if (incident?.ticket_id === ticketId) return; // already loaded
    setLoading(true);
    setError('');
    api.incidents
      .get(ticketId)
      .then((inc) => {
        setIncident(inc);
        setActiveTicket(inc);
      })
      .catch(() => setError(`Ticket ${ticketId} not found`))
      .finally(() => setLoading(false));
  }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTicket = (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    api.incidents
      .get(id.trim())
      .then((inc) => {
        setIncident(inc);
        setActiveTicket(inc);
      })
      .catch(() => setError(`Ticket ${id} not found`))
      .finally(() => setLoading(false));
  };

  return { incident, loading, error, loadTicket, ticketId };
}
