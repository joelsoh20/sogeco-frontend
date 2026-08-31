import { motion } from 'motion/react';

interface PerformanceGaugeProps {
  label: string;
  score: number;
}

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function colorFor(score: number): string {
  if (score >= 85) return '#16A34A';
  if (score >= 70) return '#1E5EFF';
  if (score >= 50) return '#D97706';
  return '#DC2626';
}

/**
 * Jauge circulaire, une par critere de notation.
 *
 * L'anneau se remplit au montage plutot que d'apparaitre plein d'un
 * coup : sur cinq jauges affichees ensemble, l'animation d'entree
 * aide l'oeil a associer chaque valeur a son libelle au lieu de tout
 * absorber en meme temps.
 */
export function PerformanceGauge({ label, score }: PerformanceGaugeProps) {
  const offset = CIRCUMFERENCE * (1 - Math.min(score, 100) / 100);
  const color = colorFor(score);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={RADIUS} fill="none" strokeWidth="7"
                className="stroke-slate-100 dark:stroke-slate-800" />
        <motion.circle
          cx="38" cy="38" r={RADIUS} fill="none" strokeWidth="7" strokeLinecap="round"
          stroke={color}
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        <text
          x="38" y="38" textAnchor="middle" dominantBaseline="central"
          className="rotate-90 fill-slate-900 text-sm font-semibold tabular dark:fill-slate-100"
          style={{ transform: 'rotate(90deg)', transformOrigin: '38px 38px' }}
        >
          {Math.round(score)}
        </text>
      </svg>
      <p className="max-w-[90px] text-xs leading-tight text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  );
}
