'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Ticket, GitBranch, Target, Brain,
  Lightbulb, UserCheck, ShieldCheck, BarChart3, Settings, Zap,
} from 'lucide-react';
import { useTicket } from '@/context/TicketContext';

const NAV = [
  {
    section: null,
    items: [
      { label: 'Dashboard', href: '/',        icon: LayoutDashboard, agent: false },
      { label: 'Tickets',   href: '/tickets', icon: Ticket,          agent: false },
    ],
  },
  {
    section: 'AI Agents',
    items: [
      { label: 'Pipeline',     href: '/incident-pipeline',     icon: GitBranch,   agent: true },
      { label: 'Auto-Triage',  href: '/auto-triage',           icon: Target,      agent: true },
      { label: 'Intelligence', href: '/incident-intelligence', icon: Brain,       agent: true },
      { label: 'IRR Agent',    href: '/irr-agent',             icon: Lightbulb,   agent: true },
      { label: 'Resolver',     href: '/human-resolver',        icon: UserCheck,   agent: true },
      { label: 'DQ Agent',     href: '/dq-agent',              icon: ShieldCheck, agent: true },
    ],
  },
  {
    section: null,
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3, agent: false },
      { label: 'Settings',  href: '/settings',  icon: Settings,  agent: false },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { activeTicket } = useTicket();

  if (collapsed) {
    return (
      <aside style={{
        width: 64, minHeight: '100vh',
        background: '#fff',
        borderRight: '1px solid #E8ECF4',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 50,
      }}>
        <div style={{
          width: '100%', height: 72,
          background: 'linear-gradient(135deg, #F41C5E 0%, #D31256 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="#fff" fill="#fff" />
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 2, width: '100%' }}>
          {NAV.flatMap(g => g.items).map(item => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const href = item.agent && activeTicket ? `${item.href}?ticket=${activeTicket.ticket_id}` : item.href;
            return (
              <Link key={item.href} href={href} title={item.label} style={{
                width: 40, height: 40, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? '#FFF0F4' : 'transparent',
                color: isActive ? '#F41C5E' : '#94A3B8',
                textDecoration: 'none',
                transition: 'background 0.12s, color 0.12s',
                position: 'relative',
              }}>
                <Icon size={17} strokeWidth={isActive ? 2.3 : 1.8} />
                {isActive && (
                  <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: '0 3px 3px 0', background: '#F41C5E' }} />
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '14px 0', borderTop: '1px solid #F0F2F5', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
        </div>
      </aside>
    );
  }

  return (
    <aside style={{
      width: 240, minHeight: '100vh',
      background: '#fff',
      borderRight: '1px solid #E8ECF4',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: '0 20px', height: 72,
        display: 'flex', alignItems: 'center',
        background: 'linear-gradient(135deg, #F41C5E 0%, #D31256 100%)',
        gap: 10, flexShrink: 0,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={15} color="#fff" fill="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em' }}>Vital-Ops</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginTop: 1 }}>AI Operations Center</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 12px', overflowY: 'auto' }}>
        {NAV.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 4 }}>
            {group.section && (
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#C0C7D4',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '10px 10px 4px',
              }}>
                {group.section}
              </div>
            )}
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              const href = item.agent && activeTicket ? `${item.href}?ticket=${activeTicket.ticket_id}` : item.href;
              return (
                <Link key={item.href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 10, marginBottom: 1,
                  textDecoration: 'none',
                  background: isActive ? '#FFF0F4' : 'transparent',
                  color: isActive ? '#F41C5E' : '#64748B',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13.5,
                  transition: 'background 0.12s, color 0.12s',
                  borderLeft: isActive ? '3px solid #F41C5E' : '3px solid transparent',
                  position: 'relative',
                }}>
                  <Icon size={15} strokeWidth={isActive ? 2.3 : 1.8} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              );
            })}
            {gi === 1 && <div style={{ height: 1, background: '#F0F2F5', margin: '6px 4px 8px' }} />}
          </div>
        ))}
      </nav>

      {/* System Status card */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #F0F2F5' }}>
        <div style={{
          background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8ECF4',
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.5)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0F172A' }}>All systems operational</div>
            <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 1 }}>v0.1.0 · online</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
