import type { ReactNode, TableHTMLAttributes } from 'react'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

export interface Column<T> {
  key: string
  header: ReactNode
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  className?: string
  render?: (row: T) => ReactNode
}

interface TableProps<T> extends Omit<TableHTMLAttributes<HTMLTableElement>, 'children'> {
  columns: Array<Column<T>>
  rows: T[]
  keyFor?: (row: T) => string
  sortBy?: string | null
  sortDirection?: SortDirection
  onSort?: (key: string) => void
  empty?: ReactNode
  loading?: boolean
}

const alignments = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export function Table<T>({
  columns,
  rows,
  keyFor,
  sortBy,
  sortDirection,
  onSort,
  empty,
  loading = false,
  className,
  ...props
}: TableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return
    onSort(column.key)
  }

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-left text-sm', className)} {...props}>
        <thead>
          <tr className="border-b border-stroke/70 dark:border-strokedark">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-bodystroke',
                  column.sortable && 'cursor-pointer select-none hover:text-primary',
                  alignments[column.align ?? 'left'],
                  column.className,
                )}
                onClick={() => handleSort(column)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {column.header}
                  {column.sortable && onSort && (
                    <>
                      {sortBy === column.key ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stroke/60 dark:divide-strokedark/60">
          {!loading &&
            rows.map((row, index) => (
              <tr
                key={keyFor?.(row) ?? index}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3',
                      alignments[column.align ?? 'left'],
                      column.className,
                    )}
                  >
                    {column.render
                      ? column.render(row)
                      : (row as Record<string, ReactNode>)[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-bodystroke">
                {empty ?? 'No records'}
              </td>
            </tr>
          )}
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}