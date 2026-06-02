import { NavLink } from 'react-router-dom'
import { BarChart3, PlusCircle, Tag, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TabConfig {
  to: string
  label: string
  icon: typeof Tag
  disabled?: boolean
}

const itemBase =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium'

export function TabBar() {
  const { t } = useTranslation()
  const tabs: TabConfig[] = [
    { to: '/', label: t('nav.income'), icon: PlusCircle },
    { to: '/services', label: t('nav.services'), icon: Tag },
    { to: '/stats', label: t('nav.stats'), icon: BarChart3 },
    { to: '/import', label: t('nav.import'), icon: Upload, disabled: true },
  ]

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.map(({ to, label, icon: Icon, disabled }) =>
        disabled ? (
          <span
            key={to}
            aria-disabled="true"
            className={`${itemBase} cursor-not-allowed text-[var(--color-fg-subtle)] opacity-50`}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </span>
        ) : (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${itemBase} ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`
            }
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ),
      )}
    </nav>
  )
}
