import { useTranslation } from 'react-i18next'
import { Check, Palette } from 'lucide-react'

import { THEMES } from '@/lib/theme/constants'
import { useTheme } from '@/features/settings/useTheme'

interface ThemeSwitcherProps {
  className?: string
}

/**
 * Theme picker rendered as a radiogroup of color swatches. The active theme is
 * persisted to localStorage via the ThemeProvider.
 */
export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label={t('settings.theme')}
      className={`flex flex-wrap gap-3 ${className ?? ''}`}
    >
      {THEMES.map(({ id, labelKey, swatchClass }) => {
        const label = t(labelKey)
        const selected = theme === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            onClick={() => setTheme(id)}
            className={[
              'flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2',
              'text-sm font-medium text-[var(--color-fg)] bg-[var(--color-surface)]',
              'transition-colors duration-[var(--duration-fast)] outline-none',
              'focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
              selected
                ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]'
                : 'border-[var(--color-border-strong)] hover:border-[var(--color-fg-muted)]',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-full border border-[var(--color-border)]"
            >
              <span className={`absolute inset-0 ${swatchClass}`} />
              {selected && (
                <Check
                  size={14}
                  strokeWidth={3}
                  className="relative text-[var(--color-primary-fg)] drop-shadow"
                />
              )}
            </span>
            <span>{label}</span>
            {selected && (
              <Palette
                size={16}
                aria-hidden="true"
                className="text-[var(--color-primary)]"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
