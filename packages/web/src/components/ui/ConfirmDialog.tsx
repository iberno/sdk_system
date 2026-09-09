import type { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      title={title ?? t('common.confirm')}
      onClose={loading ? undefined : onCancel}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelText ?? t('common.cancel')}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText ?? t('common.confirm')}
          </Button>
        </>
      }
    >
      <div className="text-sm text-body dark:text-bodydark">{message}</div>
    </Modal>
  )
}
