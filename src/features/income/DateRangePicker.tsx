import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { shiftDays, startOfMonth, todayLocal } from '@/lib/date'

/** A `provided_on` window. Empty strings mean "unbounded" on that side. */
export interface DateRange {
  from: string
  to: string
}

type PresetId = 'last7' | 'last30' | 'thisMonth' | 'all'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const { t } = useTranslation()

  function applyPreset(id: PresetId) {
    const today = todayLocal()
    switch (id) {
      case 'last7':
        onChange({ from: shiftDays(today, -6), to: today })
        return
      case 'last30':
        onChange({ from: shiftDays(today, -29), to: today })
        return
      case 'thisMonth':
        onChange({ from: startOfMonth(today), to: today })
        return
      case 'all':
        onChange({ from: '', to: '' })
        return
    }
  }

  // Keep the window non-empty: if the user picks a `from` after the current
  // `to` (or a `to` before `from`), collapse to the single chosen day rather
  // than querying a backwards range.
  function handleFrom(from: string) {
    const to = from && value.to && from > value.to ? from : value.to
    onChange({ from, to })
  }
  function handleTo(to: string) {
    const from = to && value.from && to < value.from ? to : value.from
    onChange({ from, to })
  }

  const presets: { id: PresetId; label: string }[] = [
    { id: 'last7', label: t('income.last7Days') },
    { id: 'last30', label: t('income.last30Days') },
    { id: 'thisMonth', label: t('income.thisMonth') },
    { id: 'all', label: t('income.allTime') },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="history-from" label={t('income.from')}>
          <Input
            id="history-from"
            type="date"
            className="min-w-0 appearance-none"
            value={value.from}
            max={value.to || undefined}
            onChange={(event) => handleFrom(event.target.value)}
          />
        </Field>
        <Field id="history-to" label={t('income.to')}>
          <Input
            id="history-to"
            type="date"
            className="min-w-0 appearance-none"
            value={value.to}
            min={value.from || undefined}
            onChange={(event) => handleTo(event.target.value)}
          />
        </Field>
      </div>
    </div>
  )
}
