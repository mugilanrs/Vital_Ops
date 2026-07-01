'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { KpiCard } from '@/components/shared/KpiCard';
import { Activity, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import type { AnalyticsSummary, TrendPoint } from '@/lib/types';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);

  useEffect(() => {
    api.analytics.summary().then(setSummary).catch(console.error);
    api.analytics.trends(30).then(setTrends).catch(console.error);
  }, []);

  const priorityData = summary
    ? Object.entries(summary.incidents_by_priority).map(([name, value]) => ({ name, value }))
    : [];

  const priorityColors: Record<string, string> = {
    Top: '#EF4444', High: '#F59E0B', Medium: '#3B82F6', Low: '#10B981',
  };

  const serviceData = summary
    ? Object.entries(summary.incidents_by_service)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, value]) => ({ name: name.split('/')[0].trim(), value }))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KpiCard label="Total Incidents" value={summary?.total_incidents.toLocaleString() ?? '—'} icon={<Activity size={18} />} accent="#6366F1" />
        <KpiCard label="Open Incidents" value={summary?.open_incidents.toLocaleString() ?? '—'} icon={<AlertTriangle size={18} />} accent="#F59E0B" />
        <KpiCard label="SLA Compliance" value={summary ? `${summary.sla_compliance_pct}%` : '—'} icon={<CheckCircle size={18} />} accent="#10B981" />
        <KpiCard label="Avg Resolution" value={summary ? `${summary.avg_resolution_hrs.toFixed(1)}h` : '—'} icon={<Clock size={18} />} accent="#F41C5E" />
      </div>

      {/* Trend chart */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EAECF0', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Incident Volume — Last 30 Days</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trends} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: '1px solid #EAECF0', fontSize: 12 }}
              formatter={(val, name) => [val, name === 'count' ? 'Created' : 'Resolved']}
              labelFormatter={(v) => new Date(v).toLocaleDateString()}
            />
            <Line type="monotone" dataKey="count" stroke="#F41C5E" strokeWidth={2} dot={false} name="count" />
            <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} dot={false} name="resolved" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 2, background: '#F41C5E', display: 'inline-block' }} /> Created
          </span>
          <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 2, background: '#10B981', display: 'inline-block' }} /> Resolved
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Priority breakdown */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EAECF0', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Incidents by Priority</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                {priorityData.map((entry) => (
                  <Cell key={entry.name} fill={priorityColors[entry.name] ?? '#6B7280'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EAECF0', fontSize: 12 }} formatter={(val) => [Number(val).toLocaleString()]} />
              <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By service */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EAECF0', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Top 8 Services by Volume</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 60 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EAECF0', fontSize: 12 }} formatter={(val) => [Number(val).toLocaleString(), 'Incidents']} />
              <Bar dataKey="value" fill="#F41C5E" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
