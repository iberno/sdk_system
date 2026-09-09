import type { JSX } from 'react'
import { Navigate } from 'react-router-dom'

import { usePermissions } from '@/hooks/usePermissions'

interface RequirePermissionProps {
  permissions: string[]
  require?: 'all' | 'any'
  children: JSX.Element
}

export function RequirePermission({
  permissions,
  require = 'all',
  children,
}: RequirePermissionProps) {
  const { hasAllPermissions, hasAnyPermission } = usePermissions()

  const allowed =
    require === 'all' ? hasAllPermissions(...permissions) : hasAnyPermission(...permissions)

  if (!allowed) {
    return <Navigate to="/" replace />
  }

  return children
}
