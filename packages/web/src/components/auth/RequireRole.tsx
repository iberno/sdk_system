import type { JSX } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'

interface RequireRoleProps {
  roles: string[]
  children: JSX.Element
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const role = useAuthStore((s) => s.user?.role)

  if (!role || !roles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}
