import type { BadgeTone } from '@/components/ui/Badge'

export const STATUS_ORDER = [
  'OPEN',
  'IN_PROGRESS',
  'PENDING',
  'WAITING_USER',
  'WAITING_APPROVAL',
  'RESOLVED',
  'CLOSED',
] as const

export const STATUS_TONE: Record<string, BadgeTone> = {
  OPEN: 'info',
  IN_PROGRESS: 'primary',
  PENDING: 'warning',
  WAITING_USER: 'warning',
  WAITING_APPROVAL: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
}

export const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

export const PRIORITY_TONE: Record<string, BadgeTone> = {
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'neutral',
}

export const TYPE_ORDER = ['INCIDENT', 'SERVICE_REQUEST'] as const

export const TYPE_TONE: Record<string, BadgeTone> = {
  INCIDENT: 'error',
  SERVICE_REQUEST: 'info',
  CHANGE_REQUEST: 'warning',
  PROBLEM: 'primary',
}
