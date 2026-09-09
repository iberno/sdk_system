import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  onChange: (page: number) => void
  onPreviousLabel: string
  onNextLabel: string
  infoLabel: string
  className?: string
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onChange,
  onPreviousLabel,
  onNextLabel,
  infoLabel,
  className,
}: PaginationProps) {
  const disabled = totalItems === 0
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-sm text-body dark:text-bodydark">
        {infoLabel.replace('{{page}}', String(page)).replace('{{totalPages}}', String(totalPages))}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          {onPreviousLabel}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {onNextLabel}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
