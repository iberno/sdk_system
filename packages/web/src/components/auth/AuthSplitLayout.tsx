import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'

import { LanguageSelector } from '@/components/layout/LanguageSelector'
import { useUiStore } from '@/stores/uiStore'

export const LOGIN_SPLASH_IMAGE =
  'https://images.unsplash.com/photo-1508780709619-79562169bc64?auto=format&fit=crop&q=80&w=1800'

interface AuthSplitLayoutProps {
  children: ReactNode
}

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  const { t } = useTranslation()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  return (
    <div className="min-h-dvh bg-white dark:bg-boxdark-2 lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={LOGIN_SPLASH_IMAGE} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-boxdark via-boxdark/55 to-primary/25" />
        <div className="relative z-10 flex size-full flex-col justify-between p-10">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white shadow-card">
              SD
            </div>
            <span className="text-lg font-semibold text-white">{t('app.name')}</span>
          </div>

          <div>
            <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
              {t('auth.leftTitle')}
            </h1>
            <p className="mt-3 max-w-md text-sm text-slate-200">{t('auth.leftSubtitle')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                {t('auth.statOpen')}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                {t('auth.statResolved')}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                {t('auth.statSla')}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300">
            {t('auth.photoCredit')}
            <a
              href="https://unsplash.com/@kaitlynbaker"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 underline underline-offset-2 hover:text-white"
            >
              Kaitlyn Baker
            </a>
          </p>
        </div>
      </div>

      <div className="relative flex min-h-dvh flex-col lg:min-h-0">
        <div className="flex items-center justify-end gap-1 p-4">
          <LanguageSelector />
          <button
            type="button"
            onClick={toggleTheme}
            title={t('layout.toggleTheme')}
            className="rounded-lg p-2 text-body hover:bg-graylight hover:text-graydark dark:text-bodydark dark:hover:bg-boxdark-2"
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12 pt-2">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white shadow-card">
              SD
            </div>
            <span className="text-lg font-semibold text-graydark dark:text-white">
              {t('app.name')}
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
