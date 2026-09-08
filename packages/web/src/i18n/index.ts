import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { enUS } from './locales/en-US'
import { esES } from './locales/es-ES'
import { ptBR } from './locales/pt-BR'

export const SUPPORTED_LOCALES = ['pt-BR', 'en-US', 'es-ES'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'sdk-locale'

export const detectLocale = (): Locale => {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored as Locale
  }
  const nav = navigator.language
  return (SUPPORTED_LOCALES as readonly string[]).includes(nav) ? (nav as Locale) : 'pt-BR'
}

const initial = detectLocale()

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    'en-US': { translation: enUS },
    'es-ES': { translation: esES },
  },
  lng: initial,
  fallbackLng: 'pt-BR',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

export default i18n