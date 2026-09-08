import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface FormFieldProps {
  label?: ReactNode
  error?: string
  required?: boolean
  hint?: string
  children: ReactNode
  className?: string
}

export function FormField({
  label,
  error,
  required = false,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-graydark dark:text-white">
          {label}
          {required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-bodystroke">{hint}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}