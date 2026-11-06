import type { ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Topbar } from './Topbar';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Vrai pour les ecrans plein cadre comme la carte. */
  flush?: boolean;
  /** Image de fond discrete propre a un ecran precis (ex. page Camions). */
  backgroundImage?: string;
}

export function PageShell({ title, subtitle, children, flush, backgroundImage }: PageShellProps) {
  const { alertCount, onMenuClick } = useOutletContext<{ alertCount: number; onMenuClick: () => void }>();

  return (
    <>
      <Topbar title={title} subtitle={subtitle} alertCount={alertCount} onMenuClick={onMenuClick} />
      {/* overflow-hidden ici (et non sur le scroller interne) : une image de
          fond en absolute ne reste immobile pendant le defilement que si son
          ancetre positionne n'est pas lui-meme le conteneur qui defile. */}
      <main className="relative flex-1 overflow-hidden">
        {backgroundImage && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 dark:opacity-20"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        <div className={`relative h-full ${flush ? '' : 'overflow-y-auto p-4 sm:p-6'}`}>{children}</div>
      </main>
    </>
  );
}
