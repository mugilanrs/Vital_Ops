'use client';

import { useEffect, useState } from 'react';

interface AgentTypingProps {
  messages: string[];
  intervalMs?: number;
  color?: string;
  fontSize?: number;
}

export function AgentTyping({ messages, intervalMs = 1400, color = '#9CA3AF', fontSize = 12 }: AgentTypingProps) {
  const [idx, setIdx]   = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 380);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(t);
  }, [messages, intervalMs]);

  return (
    <span style={{ fontSize, color, fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color, display: 'inline-block',
        animation: 'pulse 1s ease-in-out infinite',
      }} />
      {messages[idx]}{dots}
    </span>
  );
}
