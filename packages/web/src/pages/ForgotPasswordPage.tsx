import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react'

import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/toast-store'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting || sent) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('auth.invalidEmail'))
      return
    }
    setError(null)
    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setSubmitting(false)
    setSent(true)
    toast.success(t('auth.resetSentSubtitle'))
  }

  return (
    <AuthSplitLayout>
      <div className="w-full max-w-sm">
        {sent ? (
          <div className="flex flex-col items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-graydark dark:text-white">
                {t('auth.resetSentTitle')}
              </h1>
              <p className="mt-1.5 text-sm text-bodystroke">
                {t('auth.resetSentSubtitle')}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              {t('auth.resetBack')}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-graydark dark:text-white">
              {t('auth.resetTitle')}
            </h1>
            <p className="mt-1.5 text-sm text-bodystroke">
              {t('auth.resetSubtitle')}
            </p>

            {error && (
              <p className="mt-4 rounded-lg border border-error/30 bg-error/10 px-3 py-2.5 text-sm text-error">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <FormField label={t('auth.email')} required>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-bodystroke" />
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="pl-10"
                  />
                </div>
              </FormField>

              <Button
                type="submit"
                loading={submitting}
                className="mt-1 w-full"
                size="lg"
              >
                {t('auth.resetSend')}
              </Button>
            </form>

            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              {t('auth.backToLogin')}
            </Link>
          </>
        )}
      </div>
    </AuthSplitLayout>
  )
}