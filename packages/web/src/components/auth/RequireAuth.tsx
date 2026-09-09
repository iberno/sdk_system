import type { JSX } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'

interface RequireAuthProps {
  children: JSX.Element
}

export function RequireAuth({ children }: RequireAuthProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
