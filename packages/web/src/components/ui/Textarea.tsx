import type { TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ invalid = false, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-stroke bg-graylight px-3.5 py-2.5 text-sm text-graydark outline-none',
        'placeholder:text-bodystroke transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'dark:border-strokedark dark:bg-boxdark-3 dark:text-white dark:placeholder:text-bodydark',
        invalid && 'border-error focus:border-error focus:ring-error/20',
        className,
      )}
      {...props}
    />
  )
}