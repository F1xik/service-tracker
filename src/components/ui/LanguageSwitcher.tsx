import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

import { SUPPORTED_LANGUAGES } from '@/lib/i18n/constants'

const selectClassName = [
  'h-11 w-full appearance-none rounded-[var(--radius-md)] border py-2 pl-10 pr-8 text-sm',
  'text-[var(--color-fg)] bg-[var(--color-surface)] outline-none',
  'transition-colors duration-[var(--duration-fast)]',
  'focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-0',
  'border-[var(--color-border-strong)] hover:border-[var(--color-fg-muted)]',
].join(' ')

interface LanguageSwitcherProps {
  id?: string
  className?: string
}

/**
 * Language picker that reads the active language from i18next and switches it.
 * The browser-language-detector persists the choice to localStorage.
 */
export function LanguageSwitcher({
  id = 'language-switcher',
  className,
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language

  return (
    <div className={`relative ${className ?? ''}`}>
      <Languages
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-subtle)]"
      />
      <select
        id={id}
        aria-label={t('settings.language')}
        value={current}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        className={selectClassName}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}
