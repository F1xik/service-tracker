/**
 * Format a numeric amount as a localized currency string.
 *
 * Falls back to a plain two-decimal string when the currency code is not
 * recognised by `Intl.NumberFormat`. React-free so it stays unit-testable.
 */
export function formatPrice(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
      value,
    )
  } catch {
    return value.toFixed(2)
  }
}
