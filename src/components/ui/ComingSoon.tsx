import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Circle } from 'lucide-react';

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  sprint: string;
  description: string;
  features: string[];
}

/**
 * Ecran en attente de son backend.
 *
 * Il annonce ce qui viendra plutot que d'afficher des donnees fictives.
 * En revue de sprint, un ecran honnete sur son avancement vaut mieux
 * qu'une maquette animee : le client sait ou en est reellement le
 * produit, et la confiance tient dans la duree.
 */
export function ComingSoon({ icon: Icon, title, sprint, description, features }: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="card-padded">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-accent-soft p-3">
            <Icon size={24} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {sprint}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-600">{description}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-surface-border pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fonctionnalités prévues
          </p>
          <ul className="space-y-2.5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Circle size={15} className="mt-0.5 shrink-0 text-slate-300" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-slate-400" />
          Le modèle de données et les règles métier de ce module sont déjà spécifiés.
          Seule l’implémentation reste à livrer.
        </div>
      </div>
    </div>
  );
}
