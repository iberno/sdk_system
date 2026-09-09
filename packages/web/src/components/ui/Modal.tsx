import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  title?: ReactNode
  footer?: ReactNode
  children: ReactNode
  onClose?: () => void
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, title, footer, children, onClose, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-hidden rounded-xl bg-white shadow-dropdown dark:bg-boxdark',
          sizes[size],
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
            <h3 className="text-base font-semibold text-graydark dark:text-white">{title}</h3>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="close"
                className="rounded p-1 text-bodystroke hover:bg-graylight hover:text-body dark:hover:bg-boxdark-2"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-stroke px-5 py-4 dark:border-strokedark">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
