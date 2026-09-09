import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { useTranslation } from 'react-i18next'

import { Header } from '@/components/layout/Header'
import { PageTransition } from '@/components/layout/PageTransition'
import { Sidebar } from '@/components/layout/Sidebar'
import { NAV_SECTIONS } from '@/config/nav'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { useRealtimeEvents } from '@/hooks/useRealtime'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

export default function AppLayout() {
  const { t } = useTranslation()
  const collapsed = useUiStore((s) => s.collapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const { pathname } = useLocation()
  const accessToken = useAuthStore((s) => s.accessToken)
  const role = useAuthStore((s) => s.user?.role)
  const [mobileOpen, setMobileOpen] = useState(false)

  useRealtimeEvents()

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket()
      return
    }
    connectSocket()
    return () => {
      disconnectSocket()
    }
  }, [accessToken])

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        section: section.sectionKey ? t(section.sectionKey) : undefined,
        items: section.items
          .filter((item) => !item.roles || (role && item.roles.includes(role)))
          .map((item) => ({
            label: t(item.labelKey),
            href: item.href,
            icon: <item.icon className="size-5" />,
          })),
      })).filter((section) => section.items.length > 0),
    [t, role],
  )

  return (
    <div className="min-h-dvh">
      <Sidebar
        collapsed={collapsed}
        sections={sections}
        currentPath={pathname}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div
        className={`flex min-h-dvh flex-col transition-[padding] duration-200 lg:${collapsed ? 'pl-20' : 'pl-64'}`}
      >
        <Header onToggleSidebar={toggleSidebar} onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  )
}