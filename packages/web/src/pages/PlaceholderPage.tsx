import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'

interface PlaceholderPageProps {
  icon?: ReactNode
}

export default function PlaceholderPage({ icon }: PlaceholderPageProps) {
  const { t } = useTranslation()
  return <EmptyState icon={icon} title={t('common.empty')} description={t('common.loading')} />
}
