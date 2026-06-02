import { NavLink } from 'react-router-dom'
import { BarChart3, PlusCircle, Tag, Upload } from 'lucide-react'

interface TabConfig {
  to: string
  label: string
  icon: typeof Tag
  disabled?: boolean
}

const tabs: TabConfig[] = [
  { to: '/', label: 'Income', icon: PlusCircle },
  { to: '/services', label: 'Services', icon: Tag },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/import', label: 'Import', icon: Upload, disabled: true },
]

const itemBase =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium'

export function TabBar() {
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
