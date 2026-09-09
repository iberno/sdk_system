import { useAuthStore } from '@/stores/authStore'

export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  const permissions = user?.permissions ?? []

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes('*')) return true
    return permissions.includes(permission)
  }

  const hasAnyPermission = (...perms: string[]): boolean => {
    if (permissions.includes('*')) return true
    return perms.some((p) => permissions.includes(p))
  }

  const hasAllPermissions = (...perms: string[]): boolean => {
    if (permissions.includes('*')) return true
    return perms.every((p) => permissions.includes(p))
  }

  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions }
}
