import type { SelectHTMLAttributes } from 'react'

import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  options?: Array<{ value: string; label: string }>
}

export function Select({ invalid = false, className, options, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'w-full appearance-none rounded-lg border border-stroke bg-graylight px-3.5 py-2.5 pr-9 text-sm text-graydark outline-none',
          'transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'dark:border-strokedark dark:bg-boxdark-3 dark:text-white',
          invalid && 'border-error focus:border-error focus:ring-error/20',
          className,
        )}
        {...props}
      >
        {children ??
          options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-bodystroke"
        aria-hidden="true"
      />
    </div>
  )
}
