import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  trend?: number;
  accent?: string;
}

export function KpiCard({ label, value, sub, icon, trend, accent = '#F41C5E' }: Props) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        border: '1px solid #EAECF0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{label}</span>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${accent}12`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accent,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', lineHeight: 1 }}>
          {value}
        </div>
        {(sub || trend !== undefined) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
              fontSize: 12,
              color: '#6B7280',
            }}
          >
            {trend !== undefined && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  color: trend >= 0 ? '#10B981' : '#EF4444',
                  fontWeight: 600,
                }}
              >
                {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(trend)}%
              </span>
            )}
            {sub && <span>{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
