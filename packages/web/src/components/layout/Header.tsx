import { useTranslation } from 'react-i18next'
import { LogOut, Moon, PanelLeft, Sun, User } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { LanguageSelector } from '@/components/layout/LanguageSelector'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

interface HeaderProps {
  onToggleSidebar: () => void
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { t } = useTranslation()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stroke bg-white px-4 dark:border-strokedark dark:bg-boxdark sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        title={t('layout.toggleSidebar')}
        className="rounded-lg p-2 text-body hover:bg-graylight hover:text-graydark dark:text-bodydark dark:hover:bg-boxdark-2"
      >
        <PanelLeft className="size-5" />
      </button>

      <div className="flex items-center gap-1.5">
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