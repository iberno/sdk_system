import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Moon, PanelLeft, Sun, User } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { LanguageSelector } from '@/components/layout/LanguageSelector'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsStore, type Notification } from '@/stores/notificationsStore'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onToggleSidebar: () => void
  onOpenMobile?: () => void
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: () => void
}) {
  const navigate = useNavigate()
  const iconMap: Record<string, string> = {
    ticket_created: '🎫',
    ticket_assigned: '👤',
    approval_pending: '✅',
    sla_breached: '⏰',
    ticket_commented: '💬',
  }
  return (
    <button
      type="button"
      onClick={() => {
        onRead()
        if (notification.ticketId) navigate(`/tickets/${notification.ticketId}`)
      }}
      className={cn(
        'flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-graylight dark:hover:bg-boxdark-2',
        !notification.read && 'bg-primary/5',
      )}
    >
      <span className="text-lg">{iconMap[notification.type] ?? '📋'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-graydark dark:text-white truncate">
          {notification.title}
        </p>
        <p className="text-xs text-bodystroke truncate">{notification.message}</p>
      </div>
      {!notification.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
    </button>
  )
}

export function Header({ onToggleSidebar, onOpenMobile }: HeaderProps) {
  const { t } = useTranslation()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const notifications = useNotificationsStore((s) => s.notifications)
  const notificationCount = useNotificationsStore((s) => s.count)
  const markRead = useNotificationsStore((s) => s.markRead)
  const clearAll = useNotificationsStore((s) => s.clearAll)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stroke bg-white px-4 dark:border-strokedark dark:bg-boxdark sm:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        title={t('layout.toggleSidebar')}
        className="rounded-lg p-2 text-body hover:bg-graylight hover:text-graydark dark:text-bodydark dark:hover:bg-boxdark-2 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <button
        type="button"
        onClick={onToggleSidebar}
        title={t('layout.toggleSidebar')}
        className="hidden rounded-lg p-2 text-body hover:bg-graylight hover:text-graydark dark:text-bodydark dark:hover:bg-boxdark-2 lg:inline-flex"
      >
        <PanelLeft className="size-5" />
      </button>

      <div className="flex items-center gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title={t('layout.notifications')}
            className="relative rounded-lg p-2 text-body hover:bg-graylight hover:text-graydark dark:text-bodydark dark:hover:bg-boxdark-2"
          >
            <Bell className="size-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-4 text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-lg border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark">
                <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
                  <span className="text-sm font-semibold text-graydark dark:text-white">
                    {t('layout.notifications')}
                  </span>
                  {notificationCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAll()
                        setNotificationsOpen(false)
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {t('common.clear')}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-bodystroke">
                      {t('common.empty')}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <NotificationItem key={n.id} notification={n} onRead={() => markRead(n.id)} />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <LanguageSelector />

        <button
          type="button"
          onClick={toggleTheme}
          title={t('layout.toggleTheme')}
          className="rounded-lg p-2 text-body hover:bg-graylight hover:text-graydark dark:text-bodydark dark:hover:bg-boxdark-2"
        >
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        {user ? (
          <Dropdown
            trigger={
              <span className="ml-1 flex items-center gap-2 rounded-lg p-1.5 hover:bg-graylight dark:hover:bg-boxdark-2">
                <Avatar name={user.name} />
                <span className="hidden text-sm font-medium text-graydark dark:text-white sm:block">
                  {user.name}
                </span>
              </span>
            }
          >
            <DropdownItem onClick={() => undefined}>
              <User className="size-4" />
              {t('nav.profile')}
            </DropdownItem>
            <DropdownItem danger onClick={logout}>
              <LogOut className="size-4" />
              {t('nav.logout')}
            </DropdownItem>
          </Dropdown>
        ) : null}
      </div>
    </header>
  )
}
