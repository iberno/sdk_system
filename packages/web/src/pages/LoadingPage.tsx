import { Loader2 } from 'lucide-react'

interface LoadingPageProps {
  label?: string
}

export default function LoadingPage({ label }: LoadingPageProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="flex size-12 items-center justify-center rounded-lg bg-primary">
        <span className="text-lg font-bold text-white">SD</span>
      </div>
      <Loader2 className="size-6 animate-spin text-primary" />
      {label && <p className="text-sm text-body dark:text-bodydark">{label}</p>}
    </div>
  )
}
