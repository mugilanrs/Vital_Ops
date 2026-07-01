'use client';

import { useTicket } from '@/context/TicketContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { IncidentBar } from '@/components/layout/IncidentBar';

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { activeTicket } = useTicket();
  const collapsed = activeTicket !== null;
  const sidebarW  = collapsed ? 64 : 240;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <div style={{
        marginLeft: sidebarW,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: 'margin-left 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {activeTicket ? <IncidentBar /> : <Topbar />}
        <main style={{ flex: 1, padding: '28px 28px', minHeight: 0, background: '#F7F8FA' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
