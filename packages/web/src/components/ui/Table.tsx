import type { ReactNode, TableHTMLAttributes } from 'react'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

export interface Column<T> {
  key: string
  header: ReactNode
  sortable?: boolean
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
          <tr className="border-b border-stroke dark:border-strokedark">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body dark:text-bodydark',
                  column.sortable && 'cursor-pointer select-none hover:text-primary',
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
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" />
                      )}
                    </>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!loading &&
            rows.map((row, index) => (
              <tr
                key={keyFor?.(row) ?? index}
                className="border-b border-stroke last:border-b-0 hover:bg-graylight dark:border-strokedark dark:hover:bg-boxdark"
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3', column.className)}>
                    {column.render ? column.render(row) : (row as Record<string, ReactNode>)[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8">
                {empty ?? 'No records'}
              </td>
            </tr>
          )}
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-stroke dark:border-strokedark">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    <div className="h-3.5 w-full animate-pulse rounded bg-stroke dark:bg-strokedark" />
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}