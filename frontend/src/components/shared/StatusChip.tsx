import { PRIORITY_COLOR, STATUS_BG, STATUS_COLOR } from '@/lib/constants';

interface Props {
  value: string;
  type?: 'status' | 'priority';
  size?: 'sm' | 'md';
}

export function StatusChip({ value, type = 'status', size = 'sm' }: Props) {
  const color = type === 'priority' ? PRIORITY_COLOR[value] ?? '#6B7280' : STATUS_COLOR[value] ?? '#6B7280';
  const bg = type === 'priority' ? `${color}18` : STATUS_BG[value] ?? '#F9FAFB';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: size === 'sm' ? '3px 8px' : '4px 12px',
        borderRadius: 20,
        background: bg,
        color,
        fontWeight: 600,
        fontSize: size === 'sm' ? 11 : 12,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {value}
    </span>
  );
}
