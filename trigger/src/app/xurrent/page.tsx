'use client';

import { useState } from 'react';

const SERVICE_INSTANCES = [
  'Salesforce', 'Microsoft 365', 'ServiceNow', 'SAP ECC/S4HANA', 'Oracle EBS',
  'Guidewire PolicyCenter', 'Guidewire ClaimCenter', 'Duck Creek',
  'Active Directory/IAM', 'Network/Infrastructure', 'WSO2 API Gateway',
  'Informatica/ETL', 'HEAL',
];

const ENVIRONMENTS = ['Production', 'Pre-Production', 'Development', 'Staging'];
const SOURCES = ['Xurrent Portal', 'Email', 'Phone Call', 'API', 'Monitoring Alert'];
const CATEGORIES = ['Application Error', 'Infrastructure', 'Access/Permission', 'Performance', 'Data Issue', 'Integration'];

export default function XurrentPage() {
  const [form, setForm] = useState({
    service_instance: 'Salesforce',
    subject: '',
    description: '',
    source: 'Xurrent Portal',
    environment: 'Production',
    category: 'Application Error',
    incident_type: 'incident',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticket_id: string } | null>(null);
  const [error, setError] = useState('');

  const f = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const submit = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      setError('Subject and description are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSubmitted(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F8FA' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px', textAlign: 'center', maxWidth: 440, width: '100%', border: '1px solid #EAECF0', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', marginBottom: 8 }}>Ticket Submitted!</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
            Your incident has been created and is now visible in the Vital-Ops dashboard.
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#F41C5E', background: '#FFF0F4', padding: '10px 20px', borderRadius: 10, marginBottom: 24 }}>
            {submitted.ticket_id}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`http://localhost:3000/incident-pipeline?ticket=${submitted.ticket_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: '10px 20px', borderRadius: 10, background: '#F41C5E', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}
            >
              Run Pipeline →
            </a>
            <button
              onClick={() => { setSubmitted(null); setForm((p) => ({ ...p, subject: '', description: '' })); }}
              style={{ padding: '10px 20px', borderRadius: 10, background: '#F7F8FA', border: '1px solid #EAECF0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              Submit another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', padding: '32px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F41C5E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0A0A0A' }}>Xurrent ITSM — Submit Incident</div>
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginLeft: 46 }}>Pacific Life Assurance · Vital-Ops AI Operations Center</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EAECF0', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 18 }}>

          <Row label="Service Instance">
            <select value={form.service_instance} onChange={(e) => f('service_instance', e.target.value)} style={selStyle}>
              {SERVICE_INSTANCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Row>

          <Row label="Subject *">
            <input value={form.subject} onChange={(e) => f('subject', e.target.value)} placeholder="Brief description of the incident" style={inputStyle} />
          </Row>

          <Row label="Description *">
            <textarea value={form.description} onChange={(e) => f('description', e.target.value)} rows={4} placeholder="Detailed description of the incident, symptoms, affected users..." style={{ ...inputStyle, resize: 'vertical' }} />
          </Row>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Row label="Environment">
              <select value={form.environment} onChange={(e) => f('environment', e.target.value)} style={selStyle}>
                {ENVIRONMENTS.map((e) => <option key={e}>{e}</option>)}
              </select>
            </Row>
            <Row label="Source">
              <select value={form.source} onChange={(e) => f('source', e.target.value)} style={selStyle}>
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Row>
            <Row label="Category">
              <select value={form.category} onChange={(e) => f('category', e.target.value)} style={selStyle}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Row>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', fontSize: 13, border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: '13px 24px',
              borderRadius: 12,
              border: 'none',
              background: '#F41C5E',
              color: '#fff',
              cursor: submitting ? 'default' : 'pointer',
              fontSize: 14,
              fontWeight: 700,
              opacity: submitting ? 0.7 : 1,
              marginTop: 4,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            {submitting ? 'Submitting…' : '🎫 Submit Incident to Vital-Ops'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #EAECF0',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#0A0A0A', background: '#FAFAFA',
};

const selStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer', background: '#FAFAFA',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
