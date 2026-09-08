import type { JSX } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'

interface GuestRouteProps {
  children: JSX.Element
}

export function GuestRoute({ children }: GuestRouteProps) {
  const accessToken = useAuthStore((s) => s.accessToken)

  if (accessToken) {
    return <Navigate to="/" replace />
  }

  return children
}