import type { ReactNode } from 'react'

import { Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-graylight text-bodystroke dark:bg-boxdark">
        {icon ?? <Inbox className="size-6" aria-hidden="true" />}
      </div>
      {title && <p className="text-sm font-medium text-graydark dark:text-white">{title}</p>}
      {description && (
        <p className="max-w-sm text-sm text-body dark:text-bodydark">{description}</p>
      )}
      {action}
    </div>
  )
}