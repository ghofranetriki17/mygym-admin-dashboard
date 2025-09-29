import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { branchAPI } from '../services/branchAPI'
import { coachAPI } from '../services/coachAPI'
import { specialityAPI } from '../services/specialityAPI' // new

const emptyCoach = {
  name: '', email: '', phone: '',
  hourly_rate_online: '', hourly_rate_presential: '',
  branch_id: '', specialities: [], // array of ids
  is_available: false,
  photo_url: '',
  bio: '', certifications: '',
}

export default function Coaches() {
  const [branches, setBranches] = useState([])
  const [specialities, setSpecialities] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(false)

  // filters
  const [branchId, setBranchId] = useState('') // '' => all
  const [q, setQ] = useState('')

  // create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCoach)
  const [createErrors, setCreateErrors] = useState({})
  const [creating, setCreating] = useState(false)

  // edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(emptyCoach)
  const [editErrors, setEditErrors] = useState({})
  const [updating, setUpdating] = useState(false)

  const navigate = useNavigate()

  const loadAll = async () => {
    setLoading(true)
    try {
      const [b, s, c] = await Promise.all([
        branchAPI.list(),
        specialityAPI.list(),
        coachAPI.list(),
      ])
      setBranches(b || [])
      setSpecialities(s || [])
      setCoaches(c || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const norm = (v) => (v || '').toString().toLowerCase()

  const filtered = useMemo(() => {
    const needle = norm(q)
    const byBranch = branchId ? (c) => String(c.branch_id) === String(branchId) : () => true
    const byQuery = (c) =>
      [c.name, c.email, c.phone, c.branch?.name, ...(c.specialities?.map(s=>s.name)||[])]
        .some(v => norm(v).includes(needle))
    return coaches.filter((c) => byBranch(c) && byQuery(c))
  }, [coaches, branchId, q])

  // group by branch for "All branches" mode
  const groups = useMemo(() => {
    if (branchId) return []
    const map = new Map()
    for (const b of branches) map.set(b.id, { branch: b, items: [] })
    for (const c of filtered) {
      const key = c.branch_id
      if (!map.has(key)) map.set(key, { branch: c.branch ?? { id: key, name: 'Unknown' }, items: [] })
      map.get(key).items.push(c)
    }
    return Array.from(map.values()).filter(g => g.items.length)
  }, [filtered, branches, branchId])

  const isAvailableToday = (coach) => {
    if (coach.is_available === true || coach.is_available === 1) return true
    const avs = coach.availabilities || []
    if (!avs.length) return false
    const now = new Date()
    const today = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase()
    const match = avs.find(a => (a.day_of_week || '').toLowerCase() === today)
    if (!match || match.is_available === false || !match.start_time || !match.end_time) return false
    const hhmm = (t) => parseInt((t || '00:00').slice(0,5).replace(':',''), 10)
    const cur = now.getHours()*100 + now.getMinutes()
    return cur >= hhmm(match.start_time) && cur <= hhmm(match.end_time)
  }

  const openCreate = () => {
    setCreateErrors({})
    setCreateForm(emptyCoach)
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    setCreateErrors({})
    setCreating(true)
    try {
      // Laravel expects specialities array under key "specialities"
      await coachAPI.create({
        ...createForm,
        hourly_rate_online: Number(createForm.hourly_rate_online || 0),
        hourly_rate_presential: Number(createForm.hourly_rate_presential || 0),
      })
      setCreateOpen(false)
      setCreateForm(emptyCoach)
      await loadAll()
    } catch (e) {
      const apiErrs = e?.response?.data?.errors || {}
      const mapped = Object.fromEntries(Object.entries(apiErrs).map(([k,v]) => [k, v?.[0] || 'Invalid']))
      setCreateErrors(mapped)
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (coach) => {
    setEditId(coach.id)
    setEditErrors({})
    setEditForm({
      name: coach.name || '',
      email: coach.email || '',
      phone: coach.phone || '',
      hourly_rate_online: coach.hourly_rate_online ?? '',
      hourly_rate_presential: coach.hourly_rate_presential ?? '',
      branch_id: coach.branch_id ?? '',
      specialities: (coach.specialities || []).map(s => s.id),
      is_available: !!coach.is_available,
      photo_url: coach.photo_url || '',
      bio: coach.bio || '',
      certifications: coach.certifications || '',
    })
    setEditOpen(true)
  }

  const submitEdit = async () => {
    if (!editId) return
    setEditErrors({})
    setUpdating(true)
    try {
      await coachAPI.update(editId, {
        ...editForm,
        hourly_rate_online: Number(editForm.hourly_rate_online || 0),
        hourly_rate_presential: Number(editForm.hourly_rate_presential || 0),
      })
      setEditOpen(false)
      setEditId(null)
      await loadAll()
    } catch (e) {
      const apiErrs = e?.response?.data?.errors || {}
      const mapped = Object.fromEntries(Object.entries(apiErrs).map(([k,v]) => [k, v?.[0] || 'Invalid']))
      setEditErrors(mapped)
    } finally {
      setUpdating(false)
    }
  }

  const deleteCoach = async (id) => {
    if (!window.confirm('Delete this coach?')) return
    try {
      await coachAPI.delete(id)
      await loadAll()
    } catch (e) {
      alert(e?.response?.data?.message || 'Delete failed')
    }
  }

  const CoachCard = ({ coach }) => {
    const online = isAvailableToday(coach)
    return (
      <div className="rounded-xl border border-surface-600 bg-surface-800 p-4">
        <div className="flex items-center gap-3">
          <img
            src={coach.photo_url || 'https://via.placeholder.com/80x80?text=Coach'}
            alt={coach.name}
            className={clsx('h-14 w-14 rounded-full object-cover border', online ? 'border-emerald-500' : 'border-red-500')}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{coach.name}</h3>
              <span className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                online ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              )}>
                <span className={clsx('h-2 w-2 rounded-full', online ? 'bg-emerald-400' : 'bg-red-400')} />
                {online ? 'Available' : 'Busy'}
              </span>
            </div>
            <div className="text-xs text-gray-400 truncate">{coach.branch?.name || '—'}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {(coach.specialities || []).map(s => (
                <span key={s.id} className="rounded-md bg-surface-700 px-2 py-0.5 text-[11px] text-gray-200">{s.name}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-brand-500 text-black text-sm font-semibold"
            onClick={() => navigate('/coaches', { state: { openDetail: coach.id }})}
          >
            View
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-yellow-500 text-black text-sm"
            onClick={() => openEdit(coach)}
          >
            Edit
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm"
            onClick={() => deleteCoach(coach.id)}
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Coaches</h1>
          <p className="text-sm text-gray-400">
            {branchId ? 'Filtered by branch' : 'All branches'}
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search by name, speciality, email…"
            className="w-64 rounded-lg bg-surface-700 text-white px-3 py-2"
          />
          <select
            value={branchId}
            onChange={(e)=>setBranchId(e.target.value)}
            className="rounded-lg bg-surface-700 text-white px-3 py-2"
          >
            <option value="">All branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-brand-500 text-surface-900 font-semibold"
          >
            + New Coach
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : branchId ? (
        filtered.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => <CoachCard key={c.id} coach={c} />)}
          </div>
        ) : (
          <div className="text-gray-400">No coaches found for this branch.</div>
        )
      ) : (
        <div className="space-y-8">
          {groups.length ? groups.map(g => (
            <section key={g.branch.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{g.branch.name}</h2>
                <span className="text-xs text-gray-400">{g.items.length} coach(es)</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {g.items.map(c => <CoachCard key={c.id} coach={c} />)}
              </div>
            </section>
          )) : (
            <div className="text-gray-400">No coaches yet.</div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title="Create Coach">
        <CoachForm
          form={createForm}
          errors={createErrors}
          onChange={(k,v)=>setCreateForm(s=>({...s,[k]:v}))}
          branches={branches}
          specialities={specialities}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-700 text-white" onClick={()=>setCreateOpen(false)}>Cancel</button>
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
      <Modal open={editOpen} onClose={()=>setEditOpen(false)} title="Edit Coach">
        <CoachForm
          form={editForm}
          errors={editErrors}
          onChange={(k,v)=>setEditForm(s=>({...s,[k]:v}))}
          branches={branches}
          specialities={specialities}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-700 text-white" onClick={()=>setEditOpen(false)}>Cancel</button>
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

/* ---------- UI bits ---------- */

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-surface-600 bg-surface-800 p-5 shadow-2xl">
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

function Input({label,value,onChange,type='text',error,placeholder}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder || label}
        className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${error?'border-red-500':'border-surface-600'} focus:outline-none focus:border-brand-500`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function Textarea({label,value,onChange,error,placeholder}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <textarea
        value={value ?? ''}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder || label}
        rows={3}
        className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${error?'border-red-500':'border-surface-600'} focus:outline-none focus:border-brand-500`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function CoachForm({ form, errors={}, onChange, branches=[], specialities=[] }) {
  const toggleSpec = (id) => {
    const set = new Set(form.specialities || [])
    set.has(id) ? set.delete(id) : set.add(id)
    onChange('specialities', Array.from(set))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Input label="Name" value={form.name} onChange={v=>onChange('name',v)} error={errors.name} />
      <Input label="Email" type="email" value={form.email} onChange={v=>onChange('email',v)} error={errors.email} />
      <Input label="Phone" value={form.phone} onChange={v=>onChange('phone',v)} error={errors.phone} />
      <Input label="Photo URL" value={form.photo_url} onChange={v=>onChange('photo_url',v)} error={errors.photo_url} />
      <Input label="Hourly Rate (Online)" type="number" value={form.hourly_rate_online} onChange={v=>onChange('hourly_rate_online',v)} error={errors.hourly_rate_online} />
      <Input label="Hourly Rate (Presential)" type="number" value={form.hourly_rate_presential} onChange={v=>onChange('hourly_rate_presential',v)} error={errors.hourly_rate_presential} />

      {/* branch select */}
      <div className="space-y-1">
        <label className="text-sm text-gray-300">Branch</label>
        <select
          value={form.branch_id ?? ''}
          onChange={e=>onChange('branch_id', e.target.value)}
          className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${errors.branch_id ? 'border-red-500' : 'border-surface-600'} focus:outline-none focus:border-brand-500`}
        >
          <option value="">Select a branch…</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {errors.branch_id && <p className="text-xs text-red-400">{errors.branch_id}</p>}
      </div>

      {/* availability flag */}
      <div className="flex items-center gap-2 mt-6">
        <input
          id="is_available"
          type="checkbox"
          checked={!!form.is_available}
          onChange={e=>onChange('is_available', e.target.checked)}
        />
        <label htmlFor="is_available" className="text-sm text-gray-300">Available today</label>
      </div>

      <Textarea label="Bio" value={form.bio} onChange={v=>onChange('bio',v)} error={errors.bio} />
      <Textarea label="Certifications" value={form.certifications} onChange={v=>onChange('certifications',v)} error={errors.certifications} />

      {/* specialities */}
      <div className="md:col-span-2">
        <div className="text-sm text-gray-300 mb-2">Specialities</div>
        <div className="flex flex-wrap gap-2">
          {specialities.map(s => (
            <label key={s.id} className="inline-flex items-center gap-2 bg-surface-700 border border-surface-600 rounded-lg px-2 py-1">
              <input
                type="checkbox"
                checked={(form.specialities || []).includes(s.id)}
                onChange={()=>toggleSpec(s.id)}
              />
              <span className="text-sm text-gray-200">{s.name}</span>
            </label>
          ))}
        </div>
        {errors.specialities && <p className="text-xs text-red-400 mt-1">{errors.specialities}</p>}
      </div>
    </div>
  )
}
