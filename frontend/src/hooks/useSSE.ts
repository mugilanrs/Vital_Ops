'use client';

import { useEffect, useRef, useCallback } from 'react';

type SSEHandler = (type: string, data: Record<string, unknown>) => void;

export function useSSE(onEvent: SSEHandler) {
  const esRef = useRef<EventSource | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    const es = new EventSource(`${base}/events`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        handlerRef.current(payload.type ?? 'message', payload.data ?? payload);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);
}
