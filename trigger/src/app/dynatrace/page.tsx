'use client';

import { useState } from 'react';
import Link from 'next/link';

const SCENARIOS = [
  {
    title: 'Salesforce Login Failure',
    icon: '🔐',
    service_instance: 'Salesforce',
    subject: 'Salesforce CRM login failure — 500 users locked out',
    description: 'Dynatrace alert: SF-LOGIN-FAILURE-001. Authentication service returning 503 errors. 500+ users in Claims department unable to log in. Error rate: 47%. Started 14 minutes ago.',
    priority: 'Top',
    impact: 'Top',
    category: 'Access/Permission',
    environment: 'Production',
  },
  {
    title: 'SAP Batch Job Failure',
    icon: '⚙️',
    service_instance: 'SAP ECC/S4HANA',
    subject: 'SAP overnight batch job failure — payroll processing stopped',
    description: 'Dynatrace alert: SAP-BATCH-ERR-004. Overnight payroll batch job failed at 02:14 AM. Error: ABAP runtime error in module RPCALC00. 1,200 employee records not processed.',
    priority: 'Top',
    impact: 'Top',
    category: 'Application Error',
    environment: 'Production',
  },
  {
    title: 'Network Latency Spike',
    icon: '📡',
    service_instance: 'Network/Infrastructure',
    subject: 'Critical network latency spike — all services affected',
    description: 'Dynatrace alert: NET-LATENCY-CRITICAL. Avg response time increased from 120ms to 4200ms. All London office services degraded. BGP routing anomaly detected on MPLS circuit.',
    priority: 'High',
    impact: 'High',
    category: 'Infrastructure',
    environment: 'Production',
  },
  {
    title: 'Guidewire ClaimCenter Down',
    icon: '🏢',
    service_instance: 'Guidewire ClaimCenter',
    subject: 'ClaimCenter portal unavailable — claims processing halted',
    description: 'Dynatrace alert: GW-CC-DOWN-007. ClaimCenter web portal returning 504 Gateway Timeout. 150 claims adjusters unable to process claims. Revenue impact: ~£45K/hour.',
    priority: 'Top',
    impact: 'Top',
    category: 'Application Error',
    environment: 'Production',
  },
  {
    title: 'M365 Exchange Failure',
    icon: '📧',
    service_instance: 'Microsoft 365',
    subject: 'Microsoft 365 Exchange email outage — 2,000 users affected',
    description: 'Dynatrace alert: M365-EXCH-FAIL. Exchange Online returning NDR errors for all outbound email. MX records resolving correctly. Microsoft service health shows no active incidents.',
    priority: 'High',
    impact: 'High',
    category: 'Application Error',
    environment: 'Production',
  },
  {
    title: 'Active Directory Sync',
    icon: '🔑',
    service_instance: 'Active Directory/IAM',
    subject: 'AD sync failure — new user accounts not provisioning',
    description: 'Dynatrace alert: AD-SYNC-ERR-012. Azure AD Connect sync failing with error code 81003. 47 new starters unable to log in. HR onboarding blocked. Last successful sync: 6 hours ago.',
    priority: 'Medium',
    impact: 'Medium',
    category: 'Access/Permission',
    environment: 'Production',
  },
];

export default function DynatracePage() {
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<{ idx: number; ticket_id: string } | null>(null);
  const [error, setError] = useState('');

  const trigger = async (scenario: typeof SCENARIOS[0], idx: number) => {
    setSubmitting(idx);
    setError('');
    setSubmitted(null);
    try {
      const res = await fetch('http://localhost:8000/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scenario,
          reporter_name: 'Dynatrace Monitoring',
          organisation: 'Vital Insurance Group',
          source: 'Monitoring Alert',
          incident_type: 'incident',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSubmitted({ idx, ticket_id: data.ticket_id });
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', padding: '32px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link href="/" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>← Back</Link>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0A0A0A' }}>Dynatrace Incident Simulator</div>
        </div>

        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, marginTop: -16 }}>
          Click any scenario to instantly fire a realistic monitoring alert to Vital-Ops
        </p>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', fontSize: 13, border: '1px solid #FECACA', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {SCENARIOS.map((s, idx) => (
            <div
              key={idx}
              style={{
                background: '#fff',
                borderRadius: 16,
                border: submitted?.idx === idx ? '2px solid #10B981' : '1px solid #EAECF0',
                padding: '20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                      background: s.priority === 'Top' ? '#FEF2F2' : s.priority === 'High' ? '#FFFBEB' : '#EFF6FF',
                      color: s.priority === 'Top' ? '#EF4444' : s.priority === 'High' ? '#F59E0B' : '#3B82F6',
                    }}>
                      {s.priority}
                    </span>
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>{s.service_instance}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
                {s.subject}
              </div>

              {submitted?.idx === idx ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>
                    ✓ Sent: {submitted.ticket_id}
                  </span>
                  <a
                    href={`http://localhost:3000/incident-pipeline?ticket=${submitted.ticket_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, fontWeight: 700, color: '#F41C5E', textDecoration: 'none' }}
                  >
                    Run Pipeline →
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => trigger(s, idx)}
                  disabled={submitting !== null}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 9,
                    border: 'none',
                    background: submitting === idx ? '#F3F4F6' : '#F41C5E',
                    color: submitting === idx ? '#9CA3AF' : '#fff',
                    cursor: submitting !== null ? 'default' : 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  {submitting === idx ? 'Sending…' : '⚡ Fire Alert'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
