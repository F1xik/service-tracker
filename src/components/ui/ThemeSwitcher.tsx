import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

import { THEMES } from '@/lib/theme/constants'
import { useTheme } from '@/features/settings/useTheme'

interface ThemeSwitcherProps {
  className?: string
}

/**
 * Theme picker rendered as a radiogroup of color swatches. Each button is
 * filled with its own theme's colors so it previews the palette directly. The
 * active theme is persisted to localStorage via the ThemeProvider.
 */
export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label={t('settings.theme')}
      className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${className ?? ''}`}
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
              // The swatch class paints the button in its own theme colors
              // (background, text, border) so the button itself is the preview.
              swatchClass,
              'flex h-12 items-center justify-center rounded-[var(--radius-md)] border',
              'transition-shadow duration-[var(--duration-fast)] outline-none',
              'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] focus-visible:ring-[var(--color-ring)]',
              selected
                ? 'ring-2 ring-offset-2 ring-offset-[var(--color-bg)] ring-[var(--color-primary)]'
                : '',
            ].join(' ')}
          >
            {selected && <Check size={18} strokeWidth={3} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
