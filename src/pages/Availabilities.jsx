// src/pages/Availabilities.jsx
import { useEffect, useState, useMemo } from 'react'
import { branchAPI } from '../services/branchAPI'
import { availabilityAPI } from '../services/availabilityAPI'
import clsx from 'clsx'

const daysOfWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function Availabilities() {
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('') // '' => ALL
  const [availabilities, setAvailabilities] = useState([])
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ day_of_week:'', opening_hour:'', closing_hour:'', is_closed:false })

  // helpers
  const isToday = (day) =>
    day === new Date().toLocaleString('en-US', { weekday: 'long' })

  const makeDayMap = (avails = []) =>
    daysOfWeek.map(day => {
      const a = avails.find(v => v.day_of_week === day) || {}
      return { day, ...a }
    })

  const loadBranches = async () => {
    setLoading(true)
    try {
      const data = await branchAPI.list()      // returns branches with .availabilities
      setBranches(data)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailabilities = async () => {
    if (!branchId) return // all mode: we use branches[].availabilities
    setLoading(true)
    try {
      const data = await availabilityAPI.list(branchId)
      setAvailabilities(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBranches() }, [])
  useEffect(() => { loadAvailabilities() }, [branchId])

  // UI actions
  const openNew = () => {
    if (!branchId) return
    setEditId(null)
    setForm({ day_of_week:'', opening_hour:'', closing_hour:'', is_closed:false })
    setModalOpen(true)
  }

  const openEdit = (a) => {
    setEditId(a.id)
    setForm({
      day_of_week: a.day_of_week,
      opening_hour: a.opening_hour || '',
      closing_hour: a.closing_hour || '',
      is_closed: !!a.is_closed
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!branchId) return
    if (editId) {
      await availabilityAPI.update(branchId, editId, form)
    } else {
      await availabilityAPI.create(branchId, form)
    }
    setModalOpen(false)
    await loadAvailabilities()
    // also refresh branches so All view stays in sync later
    await loadBranches()
  }

  const del = async (id) => {
    if (!branchId) return
    if (!window.confirm('Delete this availability?')) return
    await availabilityAPI.delete(branchId, id)
    await loadAvailabilities()
    await loadBranches()
  }

  // memo for the selected branch (single-branch mode)
  const selectedBranch = useMemo(
    () => branches.find(b => String(b.id) === String(branchId)),
    [branches, branchId]
  )

  // rows to show in single-branch mode
  const singleBranchRows = makeDayMap(availabilities)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Availabilities</h1>
          <p className="text-sm text-gray-400">
            {branchId ? `Editing: ${selectedBranch?.name ?? ''}` : 'Viewing all branches'}
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={branchId}
            onChange={e => setBranchId(e.target.value)}
            className="rounded-lg bg-surface-700 text-white px-3 py-2"
          >
            <option value="">All branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <button
            onClick={openNew}
            disabled={!branchId}
            className={clsx(
              'px-4 py-2 rounded-lg font-semibold',
              branchId
                ? 'bg-brand-500 text-black hover:opacity-90'
                : 'bg-surface-700 text-gray-400 cursor-not-allowed'
            )}
            title={branchId ? 'Add availability' : 'Select a branch to add'}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading…</div>
      ) : branchId ? (
        // Single-branch editable strip
        <DayStrip
          title={selectedBranch?.name}
          rows={singleBranchRows}
          editable
          onEdit={openEdit}
          onDelete={del}
        />
      ) : (
        // ALL branches: stacked strips, read-only
        <div className="space-y-6">
          {branches.map(b => (
            <DayStrip
              key={b.id}
              title={b.name}
              rows={makeDayMap(b.availabilities || [])}
              editable={false}
            />
          ))}
          {!branches.length && (
            <div className="text-gray-400">No branches found.</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <Modal title={editId ? 'Edit Availability' : 'Add Availability'} onClose={()=>setModalOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Day</label>
              <select
                value={form.day_of_week}
                onChange={e=>setForm({...form, day_of_week:e.target.value})}
                className="w-full rounded-lg bg-surface-700 text-white px-3 py-2"
              >
                <option value="">Select day</option>
                {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="flex gap-3">
              <input
                type="time"
                value={form.opening_hour}
                onChange={e=>setForm({...form, opening_hour:e.target.value})}
                className="flex-1 rounded-lg bg-surface-700 text-white px-3 py-2"
                disabled={form.is_closed}
              />
              <input
                type="time"
                value={form.closing_hour}
                onChange={e=>setForm({...form, closing_hour:e.target.value})}
                className="flex-1 rounded-lg bg-surface-700 text-white px-3 py-2"
                disabled={form.is_closed}
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_closed}
                onChange={e=>setForm({...form, is_closed:e.target.checked})}
              />
              <span>Closed</span>
            </label>

            <div className="flex justify-end gap-2 pt-3">
              <button className="px-4 py-2 bg-gray-600 rounded-lg" onClick={()=>setModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 bg-brand-500 text-black rounded-lg" onClick={save}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ---------- Small components ---------- */

function DayStrip({ title, rows, editable = false, onEdit, onDelete }) {
  return (
    <div className="space-y-3">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}

      <div className="flex overflow-x-auto gap-3 pb-1">
        {rows.map((d) => {
          const closed = !!d.is_closed
          const today = d.day && d.day === new Date().toLocaleString('en-US', { weekday: 'long' })

          return (
            <div
              key={d.day}
              className={clsx(
                'min-w-[130px] p-3 rounded-xl border border-surface-600 bg-surface-800 text-center',
                today && 'border-brand-500'
              )}
            >
              <div className={clsx('font-semibold', today && 'text-brand-400')}>
                {d.day?.slice(0,3)}
              </div>

              <div className={clsx('mt-1 text-sm', closed ? 'text-red-400' : 'text-gray-300')}>
                {d.id
                  ? (closed ? 'Closed' : `${d.opening_hour ?? '--:--'} - ${d.closing_hour ?? '--:--'}`)
                  : 'N/A'}
              </div>

              {editable && d.id && (
                <div className="mt-2 flex gap-1 justify-center">
                  <button
                    className="text-xs px-2 py-1 bg-yellow-500 text-black rounded"
                    onClick={()=>onEdit?.(d)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-red-500 text-white rounded"
                    onClick={()=>onDelete?.(d.id)}
                  >
                    Del
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-surface-800 p-5 rounded-xl border border-surface-600 w-full max-w-md">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="hover:opacity-80">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
