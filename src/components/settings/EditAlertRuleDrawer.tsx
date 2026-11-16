import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { AlertLevel, AlertRule } from '@/types/api';

interface FormValues {
  thresholdValue: string;
  comparisonOperator: string;
  level: AlertLevel;
  cooldownMinutes: string;
  active: boolean;
}

const LEVELS: AlertLevel[] = ['CRITIQUE', 'IMPORTANT', 'MINEUR', 'INFORMATION'];
const OPERATORS = [['GT', '>'], ['GTE', '≥'], ['LT', '<'], ['LTE', '≤'], ['EQ', '=']];

interface EditAlertRuleDrawerProps {
  rule: AlertRule | null;
  onClose: () => void;
}

/** Ajuste une regle d'alerte : seuil, niveau, delai anti-repetition et activation. */
export function EditAlertRuleDrawer({ rule, onClose }: EditAlertRuleDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (!rule) return;
    setError(null);
    reset({
      thresholdValue: rule.thresholdValue == null ? '' : String(rule.thresholdValue),
      comparisonOperator: rule.comparisonOperator ?? '',
      level: rule.level,
      cooldownMinutes: String(rule.cooldownMinutes),
      active: rule.active,
    });
  }, [rule, reset]);

  const save = useMutation({
    mutationFn: (v: FormValues) => adminApi.updateAlertRule(rule!.id, {
      thresholdValue: v.thresholdValue === '' ? null : Number(v.thresholdValue),
      comparisonOperator: v.comparisonOperator || null,
      level: v.level,
      cooldownMinutes: Number(v.cooldownMinutes),
      notifyRoleCodes: rule!.notifiedRoles.join(','),
      active: v.active,
    } as unknown as Partial<AlertRule>),
    onSuccess: () => {
      toast.success(t('settingsPage.ruleSaved'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'alertRules'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const err = 'mt-1 text-xs text-red-600 dark:text-red-400';

  return (
    <Drawer open={rule !== null} onClose={onClose} title={t('settingsPage.editRule')} subtitle={rule?.label}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rule?.comparisonOperator != null && (
            <div>
              <label className="label">{t('settingsPage.ruleOperator')}</label>
              <select className="input" {...register('comparisonOperator')}>
                {OPERATORS.map(([code, sign]) => <option key={code} value={code}>{sign}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">{t('settingsPage.colThreshold')}</label>
            <input type="number" step="any" className="input" {...register('thresholdValue')} />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settingsPage.ruleThresholdHelp')}</p>
          </div>
        </div>

        <div>
          <label className="label">{t('settingsPage.colLevel')}</label>
          <select className="input" {...register('level')}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="label">{t('settingsPage.colCooldown')} (min)</label>
          <input type="number" min={1} className="input"
            {...register('cooldownMinutes', { required: t('common.requiredField'), min: { value: 1, message: t('common.requiredField') } })} />
          {errors.cooldownMinutes && <p className={err}>{errors.cooldownMinutes.message}</p>}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settingsPage.ruleCooldownHelp')}</p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('active')} />
          {t('settingsPage.ruleActive')}
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>
        )}

        <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary w-full">
          {(isSubmitting || save.isPending) && <Spinner className="text-white" />}
          <Save size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
