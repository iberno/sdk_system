import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Moon, PanelLeft, Sun, User } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { LanguageSelector } from '@/components/layout/LanguageSelector'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { useUiStore } from '@/stores/uiStore'

interface HeaderProps {
  onToggleSidebar: () => void
  onOpenMobile?: () => void
}

export function Header({ onToggleSidebar, onOpenMobile }: HeaderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const notificationCount = useNotificationsStore((s) => s.count)
  const clearNotifications = useNotificationsStore((s) => s.clear)

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
        <button
          type="button"
          onClick={() => {
            clearNotifications()
            navigate('/tickets')
          }}
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