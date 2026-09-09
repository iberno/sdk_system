import { useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface TabItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  content?: ReactNode
}

interface TabsProps {
  items: TabItem[]
  activeKey?: string
  onChange?: (key: string) => void
}

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  const [internal, setInternal] = useState<string | null>(null)
  const active = activeKey ?? internal ?? items[0]?.key

  return (
    <div>
      <div className="flex gap-1 border-b border-stroke dark:border-strokedark">
        {items.map((item) => {
          const isActive = item.key === active
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setInternal(item.key)
                onChange?.(item.key)
              }}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-body hover:text-graydark dark:text-bodydark dark:hover:text-white',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </div>
      <div className="py-4">{items.find((item) => item.key === active)?.content}</div>
    </div>
  )
}
