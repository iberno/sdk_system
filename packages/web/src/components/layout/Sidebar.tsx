import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'

export interface SidebarLinkConfig {
  label: string
  href: string
  icon: ReactNode
}

interface SidebarProps {
  collapsed: boolean
  sections: Array<{ section?: string; items: SidebarLinkConfig[] }>
  currentPath: string
  mobileOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ collapsed, sections, currentPath, mobileOpen, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const desktopWidth = collapsed ? 'lg:w-20' : 'lg:w-64'

  return (
    <>
      {/* backdrop mobile */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto bg-gradient-to-b from-boxdark-2 to-boxdark text-white transition-transform duration-200 lg:z-30 lg:transition-[width] ${desktopWidth} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-strokedark px-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm font-bold shadow-card">
          SD
        </div>
        {!collapsed && (
          <span className="truncate text-lg font-semibold">{t('app.name')}</span>
        )}
      </div>

      <nav className="flex-1 px-3 py-5">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-5 last:mb-0">
            {section.section && !collapsed && (
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-bodystroke">
                {section.section}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = currentPath === item.href
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-card'
                          : 'text-bodydark hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
    </>
  )
}