import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center">
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-2 min-w-44 overflow-hidden rounded-lg border border-stroke bg-white py-1 shadow-dropdown dark:border-strokedark dark:bg-boxdark-3',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  children: ReactNode
  onClick?: () => void
  danger?: boolean
}

export function DropdownItem({ children, onClick, danger = false }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.()
      }}
      className={cn(
        'flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-graylight dark:hover:bg-boxdark-2',
        danger ? 'text-error' : 'text-graydark dark:text-white',
      )}
    >
      {children}
    </button>
  )
}