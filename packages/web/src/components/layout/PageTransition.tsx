import type { ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const motionClass =
    navigationType === 'POP' ? 'page-enter-back' : 'page-enter-forward'

  return (
    <div key={location.key} className={motionClass}>
      {children}
    </div>
  )
}