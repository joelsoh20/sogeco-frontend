import { useTranslation } from 'react-i18next';

interface PeriodPickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function PeriodPicker({ from, to, onChange }: PeriodPickerProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="input w-auto"
      />
      <span className="text-sm text-slate-400">{t('periodPicker.to')}</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="input w-auto"
      />
    </div>
  );
}
