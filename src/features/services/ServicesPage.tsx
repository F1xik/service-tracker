import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Service } from '@/lib/calc'
import { formatPrice } from '@/lib/format'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Switch } from '@/components/ui/Switch'
import { Dialog } from '@/components/ui/Dialog'

import { ServiceForm, type ServiceFormValues } from './ServiceForm'
import {
  useCreateService,
  useDeleteService,
  useProfile,
  useServices,
  useUpdateService,
} from './useServices'

const DEFAULT_CURRENCY = 'PLN'

interface RowMenuProps {
  serviceName: string
  onEdit: () => void
  onDelete: () => void
}

function RowMenu({ serviceName, onEdit, onDelete }: RowMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('services.moreActions', { name: serviceName })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 min-w-32 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-lg)]"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-[var(--color-fg)] hover:bg-[var(--color-surface-muted)]"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            {t('services.edit')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-[var(--color-negative)] hover:bg-[var(--color-surface-muted)]"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            {t('services.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function ServicesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const profileQuery = useProfile()
  const servicesQuery = useServices()
  const createService = useCreateService()
  const updateService = useUpdateService()
  const deleteService = useDeleteService()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const currency = profileQuery.data?.currency ?? DEFAULT_CURRENCY

  function openAdd() {
    setEditing(null)
    setSubmitError(null)
    setDialogOpen(true)
  }

  function openEdit(service: Service) {
    setEditing(service)
    setSubmitError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
    setSubmitError(null)
  }

  async function handleSubmit(values: ServiceFormValues) {
    setSubmitError(null)
    try {
      if (editing) {
        await updateService.mutateAsync({ id: editing.id, patch: values })
      } else {
        await createService.mutateAsync(values)
      }
      closeDialog()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t('services.saveServiceError'),
      )
    }
  }

  function handleToggle(service: Service, active: boolean) {
    updateService.mutate({ id: service.id, patch: { active } })
  }

  function handleDelete(service: Service) {
    if (!window.confirm(t('services.deleteConfirm', { name: service.name }))) return
    deleteService.mutate(service.id)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg)]">
          {t('services.title')}
        </h1>
        <Button type="button" variant="secondary" size="sm" onClick={openAdd}>
          <Plus size={16} aria-hidden="true" />
          {t('services.add')}
        </Button>
      </header>

      <section>
        {servicesQuery.isLoading ? (
          <div
            role="status"
            aria-label={t('services.loadingServices')}
            className="flex justify-center py-10 text-[var(--color-fg-muted)]"
          >
            <Spinner />
          </div>
        ) : servicesQuery.isError ? (
          <Alert variant="error">
            {servicesQuery.error instanceof Error
              ? servicesQuery.error.message
              : t('services.loadServicesError')}
          </Alert>
        ) : servicesQuery.data && servicesQuery.data.length > 0 ? (
          <Card className="p-0">
            <ul className="divide-y divide-[var(--color-border)]">
              {servicesQuery.data.map((service) => (
                <li
                  key={service.id}
                  className={[
                    'flex items-center gap-3 px-4 py-3',
                    service.active ? '' : 'opacity-60',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="min-w-0 grow">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-[var(--color-fg)]">
                        {service.name}
                      </span>
                      {!service.active && (
                        <span className="rounded-full border border-[var(--color-border-strong)] px-2 py-0.5 text-xs text-[var(--color-fg-muted)]">
                          {t('services.inactive')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm tabular-nums text-[var(--color-fg-muted)]">
                      {formatPrice(service.price, currency, locale)}
                    </div>
                  </div>
                  <Switch
                    checked={service.active}
                    onCheckedChange={(active) => handleToggle(service, active)}
                    label={
                      service.active
                        ? t('services.deactivate', { name: service.name })
                        : t('services.activate', { name: service.name })
                    }
                  />
                  <RowMenu
                    serviceName={service.name}
                    onEdit={() => openEdit(service)}
                    onDelete={() => handleDelete(service)}
                  />
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <p className="text-center text-sm text-[var(--color-fg-muted)]">
              {t('services.noServices')}
            </p>
          </Card>
        )}
      </section>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editing ? t('services.editServiceTitle') : t('services.addServiceTitle')}
      >
        <ServiceForm
          defaultValues={
            editing ? { name: editing.name, price: editing.price } : undefined
          }
          onSubmit={handleSubmit}
          onCancel={closeDialog}
          submitting={createService.isPending || updateService.isPending}
          submitError={submitError}
          submitLabel={editing ? t('services.save') : t('services.add')}
          currency={currency}
        />
      </Dialog>
    </div>
  )
}
