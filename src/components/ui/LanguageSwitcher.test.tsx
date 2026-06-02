import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import i18n from '@/lib/i18n'
import { LANGUAGE_STORAGE_KEY } from '@/lib/i18n/constants'
import { LanguageSwitcher } from './LanguageSwitcher'

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders the supported languages and reflects the active one', () => {
    render(<LanguageSwitcher />)
    const select = screen.getByRole('combobox', { name: 'Language' })
    expect(select).toHaveValue('en')
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Русский' })).toBeInTheDocument()
  })

  it('switches the language and persists the choice to localStorage', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'ru')

    expect(i18n.resolvedLanguage).toBe('ru')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ru')
  })

  it('translates its own label when the language changes to Russian', async () => {
    const { rerender } = render(<LanguageSwitcher />)
    await i18n.changeLanguage('ru')
    rerender(<LanguageSwitcher />)

    expect(screen.getByRole('combobox', { name: 'Язык' })).toBeInTheDocument()
  })
})
