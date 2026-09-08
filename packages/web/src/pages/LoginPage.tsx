import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, KeyRound, Lock, Mail } from 'lucide-react'

import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/toast-store'
import { useAuthStore } from '@/stores/authStore'

const DEMO_ACCOUNTS = [
  { label: 'Agente', email: 'bruno@sdesk.dev' },
  { label: 'Gerente', email: 'manager@sdesk.dev' },
  { label: 'Usuário', email: 'gustavo@sdesk.dev' },
]

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const message =
        status === 401 ? t('auth.invalidCredentials') : t('auth.signInError')
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-graydark dark:text-white">
          {t('auth.welcomeBack')}
        </h1>
        <p className="mt-1.5 text-sm text-bodystroke">{t('auth.subtitle')}</p>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2.5 text-sm text-error">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
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

          <FormField
            label={t('auth.password')}
            required
            className="gap-1.5"
          >
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-bodystroke" />
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                className="pl-10 pr-16"
              />
            </div>
            <div className="flex justify-end pt-0.5">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </FormField>

          <Button
            type="submit"
            loading={submitting}
            className="mt-1 w-full"
            size="lg"
          >
            {submitting ? t('auth.signInLoading') : t('auth.signIn')}
          </Button>
        </form>

        <div className="mt-7 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <KeyRound className="size-3.5" />
            {t('auth.demoTitle')}
          </p>
          <p className="mt-1.5 text-xs text-bodystroke">{t('auth.demoHint')}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email)
                  setPassword('Senha@123')
                  setError(null)
                }}
                className="rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-graydark transition-colors hover:border-primary/40 hover:text-primary dark:bg-boxdark dark:text-white"
              >
                {account.label}: {account.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AuthSplitLayout>
  )
}