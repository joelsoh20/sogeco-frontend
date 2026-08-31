import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { maintenanceApi, partnerApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { CATEGORIES } from './MaintenanceBadges';
import type { MaintenanceCategory, MaintenanceItemRequest, MaintenanceRequest } from '@/types/api';

interface FormValues {
  vehicleId: string;
  partnerId: string;
  category: MaintenanceCategory | '';
  description: string;
  interventionDate: string;
  odometerKm: string;
  isBreakdown: boolean;
  errorCode: string;
  nextInterventionDate: string;
  nextInterventionKm: string;
  items: { itemType: MaintenanceItemRequest['itemType']; label: string; quantity: string; unitPrice: string }[];
}

interface CreateMaintenanceDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Creation d'une intervention (entretien planifie ou panne). Le
 * backend (MaintenanceController.create) existait deja mais rien dans
 * l'interface ne l'appelait — la maquette montre un bouton
 * "Nouvelle intervention" qui n'avait jamais ete raccorde.
 */
export function CreateMaintenanceDrawer({ open, onClose }: CreateMaintenanceDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'for-maintenance'], queryFn: () => vehicleApi.list(0, 200), enabled: open });
  const garages = useQuery({ queryKey: ['partners', 'garages'], queryFn: () => partnerApi.active('GARAGE'), enabled: open });

  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { isBreakdown: false, items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const isBreakdown = watch('isBreakdown');
  const category = watch('category');

  const create = useMutation({
    mutationFn: (payload: MaintenanceRequest) => maintenanceApi.create(payload),
    onSuccess: (log) => {
      toast.success(t('maintenanceForm.createSuccess', { registration: log.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      vehicleId: Number(values.vehicleId),
      partnerId: values.partnerId ? Number(values.partnerId) : undefined,
      category: values.category as MaintenanceCategory,
      description: values.description,
      interventionDate: values.interventionDate,
      odometerKm: values.odometerKm ? Number(values.odometerKm) : undefined,
      isBreakdown: values.isBreakdown,
      errorCode: values.errorCode || undefined,
      nextInterventionDate: values.nextInterventionDate || undefined,
      nextInterventionKm: values.nextInterventionKm ? Number(values.nextInterventionKm) : undefined,
      items: values.items
        .filter((item) => item.label.trim())
        .map((item) => ({
          itemType: item.itemType,
          label: item.label,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
        })),
    });
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('maintenanceForm.createTitle')} subtitle={t('maintenanceForm.createSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('compliancePage.colVehicle')}</label>
          <select className="input" {...register('vehicleId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {vehicles.data?.content.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber} — {v.brand} {v.model}</option>
            ))}
          </select>
          {errors.vehicleId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleId.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('compliancePage.colType')}</label>
            <select className="input" {...register('category', { required: t('common.requiredField') })}>
              <option value="">{t('common.selectPlaceholder')}</option>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>{t(`status.maintenanceCategory.${value}`)}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.category.message}</p>}
          </div>
          <div>
            <label className="label">{t('maintenanceForm.interventionDate')}</label>
            <input type="date" className="input" {...register('interventionDate', { required: t('common.requiredField') })} />
            {errors.interventionDate && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.interventionDate.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('maintenancePage.colDescription')}</label>
          <input className="input" placeholder={t('maintenanceForm.descriptionPlaceholder')} {...register('description', { required: t('common.requiredField') })} />
          {errors.description && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.description.message}</p>}
        </div>

        <div className="rounded-lg border border-surface-border p-3 dark:border-slate-700">
          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" className="rounded" {...register('isBreakdown')} />
            {t('maintenanceForm.isBreakdown')}
          </label>
          {isBreakdown && (
            <div className="mt-3">
              <label className="label">{t('maintenanceForm.errorCode')}</label>
              <input className="input" placeholder={t('maintenanceForm.errorCodePlaceholder')} {...register('errorCode')} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('maintenanceForm.garage')}</label>
            <select className="input" {...register('partnerId')}>
              <option value="">{t('common.none')}</option>
              {garages.data?.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('maintenanceForm.odometer')}</label>
            <input type="number" className="input" {...register('odometerKm')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('maintenanceForm.nextInterventionDate')}</label>
            <input type="date" className="input" {...register('nextInterventionDate')} />
          </div>
          <div>
            <label className="label">{t('maintenanceForm.nextInterventionKm')}</label>
            <input type="number" className="input" {...register('nextInterventionKm')} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label mb-0">{t('maintenanceForm.items')}</label>
            <button
              type="button"
              onClick={() => append({ itemType: 'PIECE', label: '', quantity: '1', unitPrice: '' })}
              className="btn-ghost py-1 text-xs"
            >
              <Plus size={14} />
              {t('common.addLine')}
            </button>
          </div>

          {category === 'LAVERIE' && (
            <div className="mt-2 flex gap-2">
              {[2500, 3000].map((price) => (
                <button
                  key={price}
                  type="button"
                  onClick={() => append({ itemType: 'MAIN_OEUVRE', label: t('maintenanceForm.washing'), quantity: '1', unitPrice: String(price) })}
                  className="btn-ghost py-1 text-xs"
                >
                  <Plus size={14} />
                  {t('maintenanceForm.washing')} — {price.toLocaleString('fr-FR')} FCFA
                </button>
              ))}
            </div>
          )}

          {fields.length > 0 && (
            <div className="mt-2 space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <select className="input" {...register(`items.${index}.itemType` as const)}>
                    <option value="PIECE">{t('maintenanceForm.itemPart')}</option>
                    <option value="MAIN_OEUVRE">{t('maintenanceForm.itemLabor')}</option>
                  </select>
                  <input className="input" placeholder={t('maintenanceForm.itemLabel')} {...register(`items.${index}.label` as const)} />
                  <input type="number" step="0.01" className="input w-20" placeholder={t('maintenanceForm.itemQty')} {...register(`items.${index}.quantity` as const)} />
                  <input type="number" className="input w-28" placeholder={t('maintenanceForm.itemUnitPrice')} {...register(`items.${index}.unitPrice` as const)} />
                  <button type="button" onClick={() => remove(index)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-red-600 dark:hover:bg-slate-800">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <Wrench size={16} />
          {t('maintenanceForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
