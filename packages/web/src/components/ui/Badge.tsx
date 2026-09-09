import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export type BadgeTone = 'success' | 'info' | 'warning' | 'error' | 'neutral' | 'primary'

const tones: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  error: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  primary: 'bg-sky-50 text-primary dark:bg-primary/15 dark:text-accent',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  dot?: boolean
}

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}
