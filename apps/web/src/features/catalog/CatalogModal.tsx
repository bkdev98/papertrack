import type { CatalogKind } from '@/app/nav'
import {
  Button,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  useToast,
} from '@/components/ui'
import { useCatalogMutations } from '@/lib/queries'
import { useState } from 'react'
import type { CatalogModalState } from './catalog-context'
import { CATALOG_FORMS, type CatalogFieldDef } from './catalog-fields'

export function CatalogModal({
  kind,
  state,
  onClose,
}: {
  kind: CatalogKind
  state: CatalogModalState | null
  onClose: () => void
}) {
  return (
    <Modal open={!!state} onClose={onClose} maxWidth={560} label="Biểu mẫu danh mục">
      {state && (
        <CatalogModalForm
          key={state.mode === 'edit' ? `edit-${state.id}` : 'create'}
          kind={kind}
          state={state}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}

function initialValue(field: CatalogFieldDef, seed: Record<string, string> | undefined): string {
  const v = seed?.[field.key]
  if (v != null && v !== '') return v
  if (field.kind === 'select') return field.options?.[0] ?? ''
  return ''
}

function CatalogModalForm({
  kind,
  state,
  onClose,
}: {
  kind: CatalogKind
  state: CatalogModalState
  onClose: () => void
}) {
  const def = CATALOG_FORMS[kind]
  const seed = state.mode === 'edit' ? state.values : undefined
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(def.fields.map((f) => [f.key, initialValue(f, seed)])),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const { create, update } = useCatalogMutations(kind)

  const set = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }))
    setError('')
  }

  async function save() {
    if (saving) return
    const name = (values.name ?? '').trim()
    if (!name) {
      setError('Thiếu tên')
      return
    }
    // Only the form's own keys are sent; the PATCH is a partial merge server-side,
    // so unlisted fields (web, note, feeText…) are preserved on edit.
    const payload: Record<string, string> = {}
    for (const f of def.fields) payload[f.key] = (values[f.key] ?? '').trim()
    payload.name = name
    if (kind === 'journals' && payload.impact) payload.impact = payload.impact.replace(',', '.')
    if (kind === 'specialIssues' && !payload.type) payload.type = 'Special Issue'

    setSaving(true)
    try {
      if (state.mode === 'edit') {
        await update.mutateAsync({ id: state.id, data: payload })
        toast.show('Đã cập nhật danh mục')
      } else {
        await create.mutateAsync(payload)
        toast.show('Đã thêm vào danh mục')
      }
      onClose()
    } catch {
      setError('Lưu không thành công — thử lại')
    } finally {
      setSaving(false)
    }
  }

  const title = state.mode === 'edit' ? def.editTitle : def.title

  return (
    <>
      <ModalHeader title={title} sub={def.sub} onClose={onClose} size="sm" />
      <ModalBody>
        <div className="grid grid-cols-2 gap-x-7 gap-y-4">
          {def.fields.map((f, i) => (
            <Field
              key={f.key}
              full={i === 0}
              label={
                <>
                  <span className="text-seal">({i + 1})</span> {f.label}
                </>
              }
            >
              {f.kind === 'select' ? (
                <Select value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={f.kind === 'date' ? 'date' : 'text'}
                  value={values[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                  autoFocus={i === 0}
                />
              )}
            </Field>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <span className="mr-auto font-serif text-[12.5px] italic text-seal">{error}</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" size="sm" onClick={save} disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </ModalFooter>
    </>
  )
}
