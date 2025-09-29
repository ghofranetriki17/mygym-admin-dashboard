// src/pages/Branches.jsx
import { useEffect, useMemo, useState } from 'react'
import { branchAPI } from '../services/branchAPI'

const emptyForm = { name: '', address: '', city: '', phone: '', email: '' }

export default function Branches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [createErrors, setCreateErrors] = useState({})
  const [creating, setCreating] = useState(false)

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [editErrors, setEditErrors] = useState({})
  const [updating, setUpdating] = useState(false)

  const loadBranches = async () => {
    setLoading(true)
    try {
      const data = await branchAPI.list()
      setBranches(data || [])
    } catch (e) {
      console.error('Failed to load branches', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBranches()
  }, [])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return branches
    return branches.filter(b =>
      [b.name, b.address, b.city, b.phone, b.email]
        .some(v => (v || '').toLowerCase().includes(qq))
    )
  }, [branches, q])

  const openCreate = () => {
    setCreateForm(emptyForm)
    setCreateErrors({})
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    setCreateErrors({})
    // quick front validation
    const required = ['name','address','city','phone','email']
    const errs = {}
    required.forEach(k => { if (!createForm[k]) errs[k] = 'Required' })
    if (Object.keys(errs).length) { setCreateErrors(errs); return }

    setCreating(true)
    try {
      await branchAPI.create(createForm)
      setCreateOpen(false)
      setCreateForm(emptyForm)
      await loadBranches()
    } catch (e) {
      // Laravel validation shape: { errors: { field: [msg] } }
      const apiErrs = e?.response?.data?.errors || {}
      const mapped = Object.fromEntries(Object.entries(apiErrs).map(([k, v]) => [k, v?.[0] || 'Invalid']))
      setCreateErrors(mapped)
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (branch) => {
    setEditId(branch.id)
    setEditForm({
      name: branch.name || '',
      address: branch.address || '',
      city: branch.city || '',
      phone: branch.phone || '',
      email: branch.email || '',
    })
    setEditErrors({})
    setEditOpen(true)
  }

  const submitEdit = async () => {
    setEditErrors({})
    if (!editId) return
    setUpdating(true)
    try {
      await branchAPI.update(editId, editForm)
      setEditOpen(false)
      setEditId(null)
      await loadBranches()
    } catch (e) {
      const apiErrs = e?.response?.data?.errors || {}
      const mapped = Object.fromEntries(Object.entries(apiErrs).map(([k, v]) => [k, v?.[0] || 'Invalid']))
      setEditErrors(mapped)
    } finally {
      setUpdating(false)
    }
  }

  const deleteBranch = async (id) => {
    if (!window.confirm('Delete this branch?')) return
    try {
      await branchAPI.delete(id)
      await loadBranches()
    } catch (e) {
      alert(e?.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold">Branches</h1>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-500 text-surface-900 font-semibold">
          + New Branch
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-surface-800 px-4 py-2 text-white"
          placeholder="Search by name, address, city, phone, email…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {/* Grid of cards */}
      {loading ? (
        <div className="py-10 text-gray-400">Loading…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <div key={b.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-surface-800 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">{b.name}</div>
                  <div className="text-gray-400 text-sm">{b.address}{b.city ? `, ${b.city}` : ''}</div>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-sm text-gray-300">
                <div>📞 {b.phone || '-'}</div>
                <div>✉️ {b.email || '-'}</div>
                <div className="text-xs text-gray-500">
                  {Array.isArray(b.availabilities) ? `${b.availabilities.length} availability slot(s)` : 'No availability data'}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEdit(b)}
                  className="px-3 py-1.5 rounded-lg bg-yellow-500 text-black font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteBranch(b.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <div className="col-span-full py-10 text-center text-gray-400">No branches found.</div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Branch">
        <BranchForm
          form={createForm}
          errors={createErrors}
          onChange={(k,v)=>setCreateForm(s=>({...s,[k]:v}))}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-700 text-white" onClick={() => setCreateOpen(false)}>
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-brand-500 text-surface-900 font-semibold"
            onClick={submitCreate}
            disabled={creating}
          >
            {creating ? 'Saving…' : 'Create'}
          </button>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Branch">
        <BranchForm
          form={editForm}
          errors={editErrors}
          onChange={(k,v)=>setEditForm(s=>({...s,[k]:v}))}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-700 text-white" onClick={() => setEditOpen(false)}>
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-brand-500 text-surface-900 font-semibold"
            onClick={submitEdit}
            disabled={updating}
          >
            {updating ? 'Updating…' : 'Update'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

/** Dumb modal (Tailwind) */
function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-surface-800 p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center"
              aria-label="Close"
            >✕</button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

/** Reusable form for create/edit */
function BranchForm({ form, errors = {}, onChange }) {
  const field = (key, label, type='text') => (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={e => onChange(key, e.target.value)}
        className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${errors[key] ? 'border-red-500' : 'border-surface-600'} focus:outline-none focus:border-brand-500`}
        placeholder={label}
      />
      {errors[key] && <p className="text-xs text-red-400">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {field('name', 'Name')}
      {field('city', 'City')}
      {field('address', 'Address')}
      {field('phone', 'Phone')}
      {field('email', 'Email', 'email')}
    </div>
  )
}
