'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [groqModel, setGroqModel] = useState('llama-3.1-8b-instant');
  const [pageSize, setPageSize] = useState('20');
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EAECF0', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>API Configuration</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Backend API URL" value={backendUrl} onChange={setBackendUrl} />
          <Field label="Groq Model" value={groqModel} onChange={setGroqModel} />
          <Field label="Default Page Size" value={pageSize} onChange={setPageSize} type="number" />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EAECF0', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>System Info</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Version', 'Vital-Ops v0.1.0'],
            ['Database', 'PostgreSQL 16 · localhost:5432/vitalops'],
            ['Vector DB', 'Qdrant · localhost:6333 · 50,000 vectors'],
            ['Embeddings', 'all-MiniLM-L6-v2 · 384 dimensions'],
            ['LLM Provider', 'Groq API'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
              <span style={{ color: '#6B7280', fontWeight: 600, minWidth: 120 }}>{label}</span>
              <span style={{ color: '#0A0A0A', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={save}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: saved ? '#10B981' : '#F41C5E',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.2s',
          }}
        >
          <Save size={14} />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '9px 12px',
          borderRadius: 10,
          border: '1px solid #EAECF0',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          outline: 'none',
          boxSizing: 'border-box',
          color: '#0A0A0A',
        }}
      />
    </div>
  );
}
