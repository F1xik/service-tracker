/**
 * Format a numeric amount as a localized currency string.
 *
 * `locale` should be the active app language (from i18next) so figures follow
 * the user's chosen language rather than the host's OS locale; omitting it falls
 * back to the runtime default. Falls back to a plain two-decimal string when the
 * currency code is not recognised by `Intl.NumberFormat`. React-free so it stays
 * unit-testable.
 */
export function formatPrice(value: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
  } catch {
    return value.toFixed(2)
  }
}

/**
 * Format a numeric amount as a plain localized decimal (no currency symbol).
 * Use this when the currency is displayed separately (e.g. in a label).
 */
export function formatAmount(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
