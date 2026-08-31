import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SkeletonTableRows } from './Skeleton';
import { fadeInUp } from '@/lib/motion';

interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyOf: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalElements?: number;
  /** Affiche des lignes en squelette a la place des donnees. */
  loading?: boolean;
}

/**
 * Tableau de liste, reutilise sur tous les ecrans a fort volume :
 * camions, missions, pleins. Une seule implementation garantit que la
 * pagination et les colonnes numeriques se comportent partout pareil.
 *
 * Chaque page de resultats porte sa propre "key" sur le <tbody> : au
 * changement de page, Motion voit un tableau enfant different et
 * rejoue l'entree en fondu plutot que de laisser les nouvelles lignes
 * remplacer les anciennes de facon abrupte.
 */
export function DataTable<T>({
  columns, data, keyOf, onRowClick, page, totalPages, onPageChange, totalElements, loading,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const showPagination = totalPages !== undefined && totalPages > 1 && onPageChange;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-surface-border bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`table-header ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {loading ? (
            <tbody>
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <SkeletonTableRows columns={columns.length} />
                </td>
              </tr>
            </tbody>
          ) : (
            <AnimatePresence mode="wait">
              <motion.tbody
                key={page ?? 'single'}
                initial="hidden"
                animate="visible"
                className="divide-y divide-surface-border dark:divide-slate-800"
              >
                {data.map((row, index) => (
                  <motion.tr
                    key={keyOf(row)}
                    variants={fadeInUp}
                    transition={{ delay: Math.min(index, 8) * 0.02 }}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60' : ''}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.header}
                        className={`table-cell ${col.className ?? ''} ${col.align === 'right' ? 'text-right tabular' : col.align === 'center' ? 'text-center' : ''}`}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </motion.tbody>
            </AnimatePresence>
          )}
        </table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            {totalElements !== undefined && `${totalElements} ${t('common.results')}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange!(page! - 1)}
              disabled={page === 0}
              className="rounded-lg border border-surface-border p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs tabular text-slate-600">
              {page! + 1} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange!(page! + 1)}
              disabled={page! + 1 >= totalPages!}
              className="rounded-lg border border-surface-border p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
