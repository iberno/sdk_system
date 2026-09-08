import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  bodyClassName?: string
  children: ReactNode
}

export function Card({ title, subtitle, actions, bodyClassName, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-stroke bg-white shadow-card dark:bg-boxdark',
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 border-b border-stroke px-5 py-4 dark:border-strokedark">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-graydark dark:text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-body dark:text-bodydark">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </div>
  )
}