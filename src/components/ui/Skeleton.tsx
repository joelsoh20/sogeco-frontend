import { cn } from '@/lib/utils';

/**
 * Squelette de chargement.
 *
 * Remplace le simple indicateur centre pour les listes et tableaux :
 * la forme du contenu a venir est deja visible, ce qui donne une
 * impression de rapidite superieure a une roue qui tourne dans le
 * vide — meme a temps de reponse egal.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md bg-slate-200/70 bg-shimmer bg-[length:200%_100%] animate-shimmer',
        'dark:bg-slate-800',
        className,
      )}
    />
  );
}

export function SkeletonTableRows({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="divide-y divide-surface-border dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={c === 0 ? 'h-4 w-28' : 'h-4 flex-1'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card-padded">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}
