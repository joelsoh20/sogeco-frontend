import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, REPAIR_CATEGORIES } from './MaintenanceBadges';
import type { MaintenanceCategory, MaintenanceItemRequest, MaintenanceLog, MaintenanceRequest } from '@/types/api';

export interface MaintenanceFormValues {
  vehicleId: string;
  category: MaintenanceCategory | '';
  description: string;
  interventionDate: string;
  testFuelLiters: string;
  errorCode: string;
  downtimeDays: string;
  laborCost: string;
  partChanged: boolean;
  partLabel: string;
  partCost: string;
}

export const isRepairCategory = (category: string) => REPAIR_CATEGORIES.includes(category as MaintenanceCategory);

/**
 * Cout saisi = main-d'oeuvre + piece changee (si elle l'a ete). Ils sont enregistres comme
 * lignes de detail : les colonnes de cout et les rapports existants les reprennent tels quels.
 */
export function buildMaintenancePayload(values: MaintenanceFormValues): MaintenanceRequest {
  const repair = isRepairCategory(values.category);
  const items: MaintenanceItemRequest[] = [];
  const labor = Number(values.laborCost || 0);
  if (labor > 0) items.push({ itemType: 'MAIN_OEUVRE', label: "Main-d'œuvre", quantity: 1, unitPrice: labor });
  if (values.partChanged && values.partLabel.trim()) {
    items.push({ itemType: 'PIECE', label: values.partLabel.trim(), quantity: 1, unitPrice: Number(values.partCost || 0) });
  }
  return {
    vehicleId: Number(values.vehicleId),
    category: values.category as MaintenanceCategory,
    description: values.description,
    interventionDate: values.interventionDate,
    testFuelLiters: values.testFuelLiters ? Number(values.testFuelLiters) : undefined,
    isBreakdown: repair,
    errorCode: repair ? values.errorCode || undefined : undefined,
    downtimeDays: repair && values.downtimeDays ? Number(values.downtimeDays) : undefined,
    items,
  };
}

/** Valeurs du formulaire pour une intervention existante : les pieces sont regroupees sur une ligne. */
export function valuesFromLog(log: MaintenanceLog): MaintenanceFormValues {
  const labor = log.items.filter((i) => i.itemType === 'MAIN_OEUVRE').reduce((s, i) => s + i.total, 0);
  const parts = log.items.filter((i) => i.itemType === 'PIECE');
  return {
    vehicleId: log.vehicleId.toString(),
    category: log.category,
    description: log.description,
    interventionDate: log.interventionDate.slice(0, 10),
    testFuelLiters: log.testFuelLiters?.toString() ?? '',
    errorCode: log.errorCode ?? '',
    downtimeDays: log.downtimeDays ? log.downtimeDays.toString() : '',
    laborCost: labor ? labor.toString() : '',
    partChanged: parts.length > 0,
    partLabel: parts.map((p) => p.label).join(', '),
    partCost: parts.length ? parts.reduce((s, p) => s + p.total, 0).toString() : '',
  };
}

interface Props {
  register: UseFormRegister<MaintenanceFormValues>;
  setValue: UseFormSetValue<MaintenanceFormValues>;
  errors: FieldErrors<MaintenanceFormValues>;
  category: MaintenanceFormValues['category'];
  partChanged: boolean;
  vehicles: { id: number; registrationNumber: string; brand: string; model: string }[];
  repairHint?: boolean;
}

const err = 'mt-1 text-xs text-red-600 dark:text-red-400';

export function MaintenanceFormFields({ register, setValue, errors, category, partChanged, vehicles, repairHint }: Props) {
  const { t } = useTranslation();
  const repair = isRepairCategory(category);
  const required = { required: t('common.requiredField') };

  return (
    <>
      <div>
        <label className="label">{t('compliancePage.colVehicle')}</label>
        <select className="input" {...register('vehicleId', required)}>
          <option value="">{t('common.selectPlaceholder')}</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.registrationNumber} — {v.brand} {v.model}</option>
          ))}
        </select>
        {repair && repairHint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('maintenanceForm.repairNeedsBreakdown')}</p>}
        {errors.vehicleId && <p className={err}>{errors.vehicleId.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t('compliancePage.colType')}</label>
          <select className="input" {...register('category', required)}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>{t(`status.maintenanceCategory.${value}`)}</option>
            ))}
          </select>
          {errors.category && <p className={err}>{errors.category.message}</p>}
        </div>
        <div>
          <label className="label">{t('maintenanceForm.interventionDate')}</label>
          <input type="date" className="input" {...register('interventionDate', required)} />
          {errors.interventionDate && <p className={err}>{errors.interventionDate.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">{t('maintenancePage.colDescription')}</label>
        <input className="input" placeholder={t('maintenanceForm.descriptionPlaceholder')} {...register('description', required)} />
        {errors.description && <p className={err}>{errors.description.message}</p>}
      </div>

      {repair && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('maintenanceForm.downtimeDays')}</label>
            <input type="number" min="0" className="input" {...register('downtimeDays', required)} />
            {errors.downtimeDays && <p className={err}>{errors.downtimeDays.message}</p>}
          </div>
          <div>
            <label className="label">{t('maintenanceForm.errorCode')}</label>
            <input className="input" placeholder={t('maintenanceForm.errorCodePlaceholder')} {...register('errorCode')} />
          </div>
        </div>
      )}

      <div>
        <label className="label">{t('maintenanceForm.testFuelLiters')}</label>
        <input type="number" step="0.01" className="input" {...register('testFuelLiters')} />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('maintenanceForm.testFuelLitersHint')}</p>
      </div>

      <div>
        <label className="label">{t('maintenanceForm.laborCost')}</label>
        <input type="number" min="0" className="input" {...register('laborCost', required)} />
        {errors.laborCost && <p className={err}>{errors.laborCost.message}</p>}
        {category === 'LAVERIE' && (
          <div className="mt-2 flex gap-2">
            {[2500, 3000].map((price) => (
              <button key={price} type="button" onClick={() => setValue('laborCost', String(price))} className="btn-ghost py-1 text-xs">
                {t('maintenanceForm.washing')} — {price.toLocaleString('fr-FR')} FCFA
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-surface-border p-3 dark:border-slate-700">
        <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="rounded" {...register('partChanged')} />
          {t('maintenanceForm.partChanged')}
        </label>
        {partChanged ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{t('maintenanceForm.partLabel')}</label>
              <input className="input" {...register('partLabel', required)} />
              {errors.partLabel && <p className={err}>{errors.partLabel.message}</p>}
            </div>
            <div>
              <label className="label">{t('maintenanceForm.partCost')}</label>
              <input type="number" min="0" className="input" {...register('partCost', required)} />
              {errors.partCost && <p className={err}>{errors.partCost.message}</p>}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('maintenanceForm.laborOnlyHint')}</p>
        )}
      </div>
    </>
  );
}
