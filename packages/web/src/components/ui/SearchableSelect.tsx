import { useEffect, useMemo, useRef, useState } from 'react'

import { Check, ChevronDown, Search } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  clearable?: boolean
}

const normalize = (text: string): string =>
  text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyMessage,
  disabled = false,
  invalid = false,
  className,
  clearable = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return options
    return options.filter((o) => normalize(o.label).includes(q))
  }, [options, query])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const selectOption = (option: SelectOption) => {
    onChange?.(option.value)
    setQuery('')
    setOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[highlighted]
      if (option) selectOption(option)
    } else if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-stroke bg-graylight px-3.5 py-2.5',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
          'dark:border-strokedark dark:bg-boxdark',
          invalid && 'border-error focus-within:border-error focus-within:ring-error/20',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <Search className="size-4 shrink-0 text-bodystroke" aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          value={open ? query : (selected?.label ?? '')}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!open}
          onFocus={() => {
            setHighlighted(0)
            setOpen(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlighted(0)
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-sm text-graydark outline-none placeholder:text-bodystroke dark:text-white dark:placeholder:text-bodydark"
        />
        {clearable && selected && (
          <button
            type="button"
            aria-label="clear"
            onClick={() => {
              onChange?.(null)
              setQuery('')
            }}
            className="shrink-0 rounded p-0.5 text-bodystroke hover:text-body"
          >
            <ChevronDown className="size-4 rotate-180" />
          </button>
        )}
        {!clearable && !selected && <ChevronDown className="size-4 shrink-0 text-bodystroke" />}
      </div>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stroke bg-white py-1 shadow-dropdown dark:border-strokedark dark:bg-boxdark"
        >
          {filtered.length === 0 && (
            <li className="px-3.5 py-2 text-sm text-bodystroke">
              {emptyMessage ?? 'No results'}
            </li>
          )}
          {filtered.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm',
                  index === highlighted
                    ? 'bg-primary-soft text-primary dark:bg-primary/15 dark:text-accent'
                    : 'text-graydark dark:text-white',
                )}
              >
                {option.label}
                {option.value === value && <Check className="size-4 shrink-0" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}