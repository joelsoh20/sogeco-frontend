import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Printer, Users } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { clientApi } from '@/api/endpoints';
import { formatDate } from '@/lib/utils';

interface ClientListDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Liste complete des clients avec telephone et adresse mail, avec
 * impression. La zone imprimable est marquee .print-area (regle
 * globale dans index.css) : window.print() n'imprime alors que cette
 * table, pas le reste de l'application derriere le tiroir.
 */
export function ClientListDrawer({ open, onClose }: ClientListDrawerProps) {
  const { t } = useTranslation();
  const clients = useQuery({
    queryKey: ['clients', 'list-all'],
    queryFn: () => clientApi.list(0, 500),
    enabled: open,
  });

  return (
    <Drawer open={open} onClose={onClose} title={t('clientList.title')} subtitle={t('clientList.subtitle')}>
      <div className="space-y-4">
        <div className="no-print flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('clientList.count', { count: clients.data?.totalElements ?? 0 })}
          </p>
          <button onClick={() => window.print()} className="btn-primary" disabled={!clients.data?.content.length}>
            <Printer size={16} />
            {t('clientList.print')}
          </button>
        </div>

        {clients.isLoading ? (
          <LoadingPanel />
        ) : !clients.data?.content.length ? (
          <EmptyState icon={Users} title={t('clientList.empty')} />
        ) : (
          <div className="print-area">
            <div className="mb-3 hidden print:block">
              <h1 className="text-lg font-semibold">{t('clientList.printHeaderTitle')}</h1>
              <p className="text-xs text-slate-500">{t('clientList.generatedOn', { date: formatDate(new Date().toISOString()) })}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-3">{t('clientList.colClient')}</th>
                  <th className="py-2 pr-3">{t('clientList.colContact')}</th>
                  <th className="py-2 pr-3">{t('clientList.colPhone')}</th>
                  <th className="py-2 pr-3">{t('clientList.colEmail')}</th>
                  <th className="py-2">{t('clientList.colCity')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border dark:divide-slate-800">
                {clients.data.content.map((client) => (
                  <tr key={client.id}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{client.companyName}</p>
                      {client.code && <p className="text-xs text-slate-400">{client.code}</p>}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{client.contactName ?? '—'}</td>
                    <td className="py-2.5 pr-3 tabular text-slate-600 dark:text-slate-300">{client.phone ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{client.email ?? '—'}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{client.cityName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Drawer>
  );
}
