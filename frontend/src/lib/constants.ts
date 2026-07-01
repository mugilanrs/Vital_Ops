export const PRIORITIES = ['Top', 'High', 'Medium', 'Low'] as const;
export const STATUSES = ['New', 'In Progress', 'Resolved', 'Closed', 'Cancelled'] as const;

export const PRIORITY_COLOR: Record<string, string> = {
  Top: '#EF4444',
  High: '#F59E0B',
  Medium: '#3B82F6',
  Low: '#10B981',
};

export const STATUS_COLOR: Record<string, string> = {
  New: '#6366F1',
  'In Progress': '#F59E0B',
  Resolved: '#10B981',
  Closed: '#6B7280',
  Cancelled: '#EF4444',
};

export const STATUS_BG: Record<string, string> = {
  New: '#EEF2FF',
  'In Progress': '#FFFBEB',
  Resolved: '#ECFDF5',
  Closed: '#F9FAFB',
  Cancelled: '#FEF2F2',
};

export const PIPELINE_STAGES = [
  { key: 'triage', label: 'Auto-Triage', icon: 'Target' },
  { key: 'intelligence', label: 'Intelligence', icon: 'Brain' },
  { key: 'irr', label: 'IRR Agent', icon: 'Lightbulb' },
  { key: 'human_review', label: 'Human Review', icon: 'UserCheck' },
  { key: 'dq', label: 'DQ Validation', icon: 'CheckSquare' },
] as const;

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Tickets', href: '/tickets', icon: 'Ticket' },
  { label: 'Incident Pipeline', href: '/incident-pipeline', icon: 'GitBranch' },
  { label: 'Auto-Triage Agent', href: '/auto-triage', icon: 'Target' },
  { label: 'Incident Intelligence', href: '/incident-intelligence', icon: 'Brain' },
  { label: 'IRR Agent', href: '/irr-agent', icon: 'Lightbulb' },
  { label: 'Human Resolver', href: '/human-resolver', icon: 'UserCheck' },
  { label: 'DQ Agent', href: '/dq-agent', icon: 'ShieldCheck' },
  { label: 'Analytics', href: '/analytics', icon: 'BarChart3' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const;
