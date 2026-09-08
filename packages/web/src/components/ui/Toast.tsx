import { cn } from '@/lib/utils'
import { useToastStore } from '@/components/ui/toast-store'
import type { Toast } from '@/components/ui/toast-store'

const toneStyles: Record<Toast['tone'], string> = {
  success: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
  error: 'border-red-500 text-red-600 dark:text-red-400',
  warning: 'border-amber-500 text-amber-600 dark:text-amber-400',
  info: 'border-sky-500 text-sky-600 dark:text-sky-400',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto rounded-lg border-l-4 border bg-white px-4 py-3 text-left text-sm shadow-dropdown dark:bg-boxdark',
            toneStyles[t.tone],
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}