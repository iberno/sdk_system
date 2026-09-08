import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  bodyClassName?: string
  hoverable?: boolean
  children: ReactNode
}

export function Card({
  title,
  subtitle,
  actions,
  bodyClassName,
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-stroke/80 bg-white shadow-sm transition-[box-shadow,border-color] duration-200 dark:border-strokedark dark:bg-boxdark',
        hoverable && 'hover:border-primary/30 hover:shadow-dropdown',
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-graydark dark:text-white">{title}</h3>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-bodystroke">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('px-5 pb-5', title ? 'pt-0' : undefined, bodyClassName)}>{children}</div>
    </div>
  )
}