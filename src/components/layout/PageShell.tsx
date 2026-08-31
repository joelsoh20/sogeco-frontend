import type { ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Topbar } from './Topbar';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Vrai pour les ecrans plein cadre comme la carte. */
  flush?: boolean;
}

export function PageShell({ title, subtitle, children, flush }: PageShellProps) {
  const { alertCount, onMenuClick } = useOutletContext<{ alertCount: number; onMenuClick: () => void }>();

  return (
    <>
      <Topbar title={title} subtitle={subtitle} alertCount={alertCount} onMenuClick={onMenuClick} />
      <main className={flush ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto p-4 sm:p-6'}>
        {children}
      </main>
    </>
  );
}
