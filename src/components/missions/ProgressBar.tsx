export function ProgressBar({ value }: { value: number }) {
  const color = value >= 100 ? 'bg-emerald-500' : value > 0 ? 'bg-accent' : 'bg-slate-200';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="w-9 shrink-0 text-xs tabular text-slate-500">{Math.round(value)}%</span>
    </div>
  );
}
