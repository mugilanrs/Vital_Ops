'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Incident, TriageResult, IntelligenceResult, IrrResult } from '@/lib/types';

export type StageStatus = 'pending' | 'running' | 'done' | 'error';

export interface StageState {
  status: StageStatus;
  durationMs?: number;
  confidence?: number;
  error?: string;
}

const INITIAL_STAGES = (): Record<string, StageState> => ({
  triage:       { status: 'pending' },
  intelligence: { status: 'pending' },
  irr:          { status: 'pending' },
  resolver:     { status: 'pending' },
  dq:           { status: 'pending' },
});

interface PipelineResults {
  triage:       TriageResult | null;
  intelligence: IntelligenceResult | null;
  irr:          IrrResult | null;
}

interface TicketContextValue {
  activeTicket:    Incident | null;
  setActiveTicket: (t: Incident | null) => void;
  clearTicket:     () => void;
  stages:          Record<string, StageState>;
  setStage:        (key: string, s: StageState) => void;
  results:         PipelineResults;
  setResult:       <K extends keyof PipelineResults>(key: K, v: PipelineResults[K]) => void;
  resetPipeline:   () => void;
}

const Ctx = createContext<TicketContextValue>({
  activeTicket:    null,
  setActiveTicket: () => {},
  clearTicket:     () => {},
  stages:          INITIAL_STAGES(),
  setStage:        () => {},
  results:         { triage: null, intelligence: null, irr: null },
  setResult:       () => {},
  resetPipeline:   () => {},
});

export function TicketProvider({ children }: { children: ReactNode }) {
  const [activeTicket, setActiveTkt] = useState<Incident | null>(null);
  const [stages, setStages]          = useState<Record<string, StageState>>(INITIAL_STAGES());
  const [results, setResults]        = useState<PipelineResults>({ triage: null, intelligence: null, irr: null });

  const setActiveTicket = useCallback((t: Incident | null) => setActiveTkt(t), []);

  const clearTicket = useCallback(() => {
    setActiveTkt(null);
    setStages(INITIAL_STAGES());
    setResults({ triage: null, intelligence: null, irr: null });
  }, []);

  const setStage = useCallback((key: string, s: StageState) => {
    setStages(p => ({ ...p, [key]: s }));
  }, []);

  const setResult = useCallback(<K extends keyof PipelineResults>(key: K, v: PipelineResults[K]) => {
    setResults(p => ({ ...p, [key]: v }));
  }, []);

  const resetPipeline = useCallback(() => {
    setStages(INITIAL_STAGES());
    setResults({ triage: null, intelligence: null, irr: null });
  }, []);

  return (
    <Ctx.Provider value={{ activeTicket, setActiveTicket, clearTicket, stages, setStage, results, setResult, resetPipeline }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTicket() {
  return useContext(Ctx);
}
