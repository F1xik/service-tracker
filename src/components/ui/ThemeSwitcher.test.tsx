import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ThemeProvider } from '@/features/settings/ThemeContext'
import { THEME_STORAGE_KEY } from '@/lib/theme/constants'
import { ThemeSwitcher } from './ThemeSwitcher'

function renderSwitcher() {
  return render(
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>,
  )
}

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    document.documentElement.className = ''
  })

  it('renders a radio for each theme and marks the active one', () => {
    renderSwitcher()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    // Light is the default, so it should be checked initially.
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('selects a theme, applies the root class, and persists the choice', async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByRole('radio', { name: 'Violet' }))

    expect(screen.getByRole('radio', { name: 'Violet' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(document.documentElement.classList.contains('theme-pastel-violet')).toBe(
      true,
    )
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('pastel-violet')
  })

  it('switching themes clears the previous root class', async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await user.click(screen.getByRole('radio', { name: 'Pink' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('theme-pastel-pink')).toBe(true)
  })
})
