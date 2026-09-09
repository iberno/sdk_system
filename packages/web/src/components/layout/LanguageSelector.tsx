import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from '@/i18n'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const LOCALE_LABELS: Record<string, string> = {
  'pt-BR': 'Português',
  'en-US': 'English',
  'es-ES': 'Español',
}

export function LanguageSelector() {
  const { i18n } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const setLocale = useAuthStore((s) => s.setLocale)

  const changeLanguage = async (locale: string) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    await i18n.changeLanguage(locale)
    if (user) {
      setLocale(locale)
      await api.patch(`/users/${user.id}`, { locale }).catch(() => undefined)
    }
  }

  const current = i18n.resolvedLanguage

  return (
    <Dropdown
      trigger={
        <span className="flex items-center gap-2 rounded-lg p-2 text-bodydark hover:bg-graylight hover:text-graydark dark:hover:bg-boxdark-2">
          <Globe className="size-5" />
        </span>
      }
    >
      {SUPPORTED_LOCALES.map((locale) => (
        <DropdownItem key={locale} onClick={() => void changeLanguage(locale)}>
          <span className={cn(locale === current && 'font-semibold text-primary')}>
            {LOCALE_LABELS[locale]}
          </span>
        </DropdownItem>
      ))}
    </Dropdown>
  )
}
