import { useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ErrorPage() {
  const { t } = useTranslation()
  const error = useRouteError()

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-stroke bg-white p-8 shadow-card dark:border-strokedark dark:bg-boxdark">
          <EmptyState
            icon={<AlertTriangle className="size-6 text-error" />}
            title="Oops!"
            description={String((error as { message?: string })?.message ?? t('common.error'))}
            action={
              <Button variant="secondary" onClick={() => window.location.assign('/')}>
                {t('common.back')}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  )
}