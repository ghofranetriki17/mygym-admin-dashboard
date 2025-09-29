// src/pages/CoachAvailabilities.jsx
import { useEffect, useState, useMemo } from 'react'
import { coachAPI } from '../services/coachAPI'
import { coachAvailabilityAPI } from '../services/coachAvailabilityAPI'

const emptyAvailability = {
  coach_id: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
  is_available: true, // auto-calculated; not user-editable
}

const daysOfWeek = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

const dayToIndex = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

/* -------------------- Time helpers -------------------- */

function nowLocal() {
  return new Date()
}

// “09:00” or “09:00:00” -> {h, m}
function parseHHMM(s) {
  if (!s) return null
  const [hh, mm] = String(s).split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null
  return { h: hh, m: mm }
}

// minutes since midnight
function toMinutes(hhmm) {
  if (!hhmm) return null
  return hhmm.h * 60 + hhmm.m
}

function minutesSinceMidnight(d = nowLocal()) {
  return d.getHours() * 60 + d.getMinutes()
}

function todaySlug() {
  const i = nowLocal().getDay() // 0=Sun…6=Sat
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][i]
}

function formatClock(s) {
  if (!s) return ''
  return String(s).slice(0,5) // HH:MM
}

function labelForDay(slug) {
  const f = daysOfWeek.find(d => d.value === (slug||'').toLowerCase())
  return f?.label || slug
}

// true if now ∈ [start, end) on that day (no overnight here)
function isNowInSlot(day_slug, start_time, end_time) {
  const day = (day_slug||'').toLowerCase()
  if (day !== todaySlug()) return false
  const st = toMinutes(parseHHMM(String(start_time||'').slice(0,5)))
  const et = toMinutes(parseHHMM(String(end_time||'').slice(0,5)))
  if (st == null || et == null) return false
  if (et <= st) return false // no overnight support in this version
  const nowM = minutesSinceMidnight()
  return nowM >= st && nowM < et
}

// Next occurrence (>= now) of (day_slug, start_time). No overnight.
function nextOccurrence(day_slug, start_time) {
  const now = nowLocal()
  const targetDayIdx = dayToIndex[(day_slug||'').toLowerCase()]
  const hhmm = parseHHMM(String(start_time||'').slice(0,5))
  if (targetDayIdx == null || !hhmm) return null

  const d = new Date(now)
  const todayIdx = d.getDay()
  let addDays = (targetDayIdx - todayIdx + 7) % 7

  // if target is today but time already passed -> +7d
  const nowM = minutesSinceMidnight(now)
  if (addDays === 0 && nowM > toMinutes(hhmm)) addDays = 7

  d.setDate(d.getDate() + addDays)
  d.setHours(hhmm.h, hhmm.m, 0, 0)
  return d
}

function diffHM(from, to) {
  const ms = Math.max(0, to - from)
  const min = Math.round(ms / 60000)
  const h = Math.floor(min / 60)
  const m = min % 60
  return { h, m }
}

/* --------- Label helpers (Available now / Next shift …) --------- */

// For a single slot (the one being edited/created)
function computeStatusInfo(coachId, day, start, end, allAvailabilities) {
  const now = nowLocal()
  const nowFlag = isNowInSlot(day, start, end)

  if (nowFlag) {
    return { now: true, label: '' }
  }

  // If this slot is later today, show Starts in …
  if (day === todaySlug()) {
    const st = parseHHMM(start)
    const et = parseHHMM(end)
    if (st && et && toMinutes(et) > toMinutes(st)) {
      const startToday = new Date(now)
      startToday.setHours(st.h, st.m, 0, 0)
      if (startToday > now) {
        const { h, m } = diffHM(now, startToday)
        return { now: false, label: `Starts in ${h}h ${m}m (${labelForDay(day)} ${formatClock(start)})` }
      }
    }
  }

  // Otherwise, find the next upcoming slot for this coach
  const candidates = (allAvailabilities || [])
    .filter(a => String(a.coach_id) === String(coachId))
    .map(a => {
      const when = nextOccurrence(a.day_of_week, a.start_time)
      return when ? { when, day: (a.day_of_week||'').toLowerCase(), start: a.start_time } : null
    })
    .filter(Boolean)
    .sort((x, y) => x.when - y.when)

  if (candidates.length) {
    const next = candidates[0]
    const { h, m } = diffHM(now, next.when)
    return { now: false, label: `Next shift in ${h}h ${m}m (${labelForDay(next.day)} ${formatClock(next.start)})` }
  }

  return { now: false, label: 'No upcoming shift found.' }
}

// For a list of slots of ONE coach (used next to coach name in grouped section)
function computeNextShiftLabel(slots) {
  const now = new Date()
  const hasNow = slots.some(a => isNowInSlot(a.day_of_week, a.start_time, a.end_time) && a.is_available)
  if (hasNow) {
    return { now: true, text: 'Available now' }
  }

  const candidates = (slots || [])
    .map(a => {
      const when = nextOccurrence(a.day_of_week, a.start_time)
      return when ? { when, day: (a.day_of_week||'').toLowerCase(), start: a.start_time } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.when - b.when)

  if (!candidates.length) return { now: false, text: 'No upcoming shift' }

  const next = candidates[0]
  const { h, m } = diffHM(now, next.when)
  return { now: false, text: `Next shift in ${h}h ${m}m (${labelForDay(next.day)} ${formatClock(next.start)})` }
}

/* ----------------------------------------------------- */

export default function CoachAvailabilities() {
  const [coaches, setCoaches] = useState([])
  const [availabilities, setAvailabilities] = useState([])
  const [loading, setLoading] = useState(false)

  // filters
  const [selectedCoach, setSelectedCoach] = useState('')
  const [selectedDay, setSelectedDay] = useState('')

  // refresh labels each minute
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyAvailability)
  const [createErrors, setCreateErrors] = useState({})
  const [creating, setCreating] = useState(false)

  // edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(emptyAvailability)
  const [editErrors, setEditErrors] = useState({})
  const [updating, setUpdating] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [c, a] = await Promise.all([coachAPI.list(), coachAvailabilityAPI.list()])
      setCoaches(c || [])
      setAvailabilities(a || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const filtered = useMemo(() => {
    return availabilities.filter(a => {
      const byCoach = selectedCoach ? String(a.coach_id) === String(selectedCoach) : true
      const byDay = selectedDay ? (a.day_of_week||'').toLowerCase() === selectedDay : true
      return byCoach && byDay
    })
  }, [availabilities, selectedCoach, selectedDay, tick])

  // Group by coach for display when none selected
  const groups = useMemo(() => {
    if (selectedCoach) return []
    const map = new Map()
    for (const coach of coaches) map.set(coach.id, { coach, items: [] })
    for (const a of filtered) {
      const id = a.coach_id
      if (!map.has(id)) map.set(id, { coach: { id, name: 'Unknown Coach' }, items: [] })
      map.get(id).items.push(a)
    }
    return Array.from(map.values()).filter(g => g.items.length > 0)
  }, [filtered, coaches, selectedCoach])

  const getCoachName = (coachId) => {
    const coach = coaches.find(c => String(c.id) === String(coachId))
    return coach?.name || 'Unknown Coach'
  }

  const formatTime = (time) => formatClock(time)

  const getDayLabel = (dayValue) => labelForDay(dayValue)

  const openCreate = () => {
    setCreateErrors({})
    setCreateForm(emptyAvailability)
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    setCreateErrors({})
    setCreating(true)
    try {
      await coachAvailabilityAPI.create(createForm)
      setCreateOpen(false)
      setCreateForm(emptyAvailability)
      await loadAll()
    } catch (e) {
      const apiErrs = e?.response?.data?.errors || {}
      const mapped = Object.fromEntries(Object.entries(apiErrs).map(([k,v]) => [k, v?.[0] || 'Invalid']))
      setCreateErrors(mapped)
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (availability) => {
    setEditId(availability.id)
    setEditErrors({})
    setEditForm({
      coach_id: availability.coach_id || '',
      day_of_week: (availability.day_of_week || '').toLowerCase(),
      start_time: formatTime(availability.start_time),
      end_time: formatTime(availability.end_time),
      is_available: isNowInSlot(availability.day_of_week, availability.start_time, availability.end_time),
    })
    setEditOpen(true)
  }

  const submitEdit = async () => {
    if (!editId) return
    setEditErrors({})
    setUpdating(true)
    try {
      await coachAvailabilityAPI.update(editId, editForm)
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

  const deleteAvailability = async (id) => {
    if (!window.confirm('Delete this availability?')) return
    try {
      await coachAvailabilityAPI.delete(id)
      await loadAll()
    } catch (e) {
      alert(e?.response?.data?.message || 'Delete failed')
    }
  }

  /* -------------------- Card -------------------- */
  const AvailabilityCard = ({ availability }) => {
    const nowFlag = availability.is_available && isNowInSlot(availability.day_of_week, availability.start_time, availability.end_time)

    return (
      <div className="rounded-xl border border-surface-600 bg-surface-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-400">{getCoachName(availability.coach_id)}</div>
          {/* No button here anymore; the status is shown next to coach name in the grouped header */}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-brand-400 font-semibold">
              {getDayLabel(availability.day_of_week)}
            </span>
            {nowFlag && (
              <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Available now
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-sm">
              {formatTime(availability.start_time)} - {formatTime(availability.end_time)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-yellow-500 text-black text-sm"
            onClick={() => openEdit(availability)}
          >
            Edit
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm"
            onClick={() => deleteAvailability(availability.id)}
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  // selected coach global “now” badge
  const selectedCoachNow = useMemo(() => {
    if (!selectedCoach) return false
    return availabilities.some(
      a => String(a.coach_id) === String(selectedCoach)
        && a.is_available
        && isNowInSlot(a.day_of_week, a.start_time, a.end_time)
    )
  }, [availabilities, selectedCoach, tick])

  // label for selectedCoach (next to title)
  const selectedCoachLabel = useMemo(() => {
    if (!selectedCoach) return ''
    const slots = availabilities.filter(a => String(a.coach_id) === String(selectedCoach))
    const info = computeNextShiftLabel(slots)
    return info.now ? 'Available now' : info.text
  }, [availabilities, selectedCoach, tick])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">Coach Availabilities</h1>
          {/* If a coach is selected, show status right after the title */}
          {selectedCoach && (
            <span
              className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                selectedCoachNow ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-700 text-gray-300'
              }`}
              title={selectedCoachLabel}
            >
              {selectedCoachLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
            className="rounded-lg bg-surface-700 text-white px-3 py-2 border border-surface-600"
          >
            <option value="">All coaches</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="rounded-lg bg-surface-700 text-white px-3 py-2 border border-surface-600"
          >
            <option value="">All days</option>
            {daysOfWeek.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>

          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-brand-500 text-surface-900 font-semibold"
          >
            + New Availability
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : selectedCoach ? (
        (() => {
          const list = filtered
          return list.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map(a => <AvailabilityCard key={a.id} availability={a} />)}
            </div>
          ) : (
            <div className="text-gray-400">No availabilities found for this coach.</div>
          )
        })()
      ) : (
        <div className="space-y-8">
          {groups.length ? groups.map(g => {
            const info = computeNextShiftLabel(g.items) // <-- label next to coach name
            return (
              <section key={g.coach.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    {g.coach.name}
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        info.now ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-700 text-gray-300'
                      }`}
                      title={info.text}
                    >
                      {info.text}
                    </span>
                  </h2>
                  <span className="text-xs text-gray-400">{g.items.length} availability slot(s)</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.items.map(a => <AvailabilityCard key={a.id} availability={a} />)}
                </div>
              </section>
            )
          }) : (
            <div className="text-gray-400">No availabilities found.</div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Availability">
        <AvailabilityForm
          form={createForm}
          errors={createErrors}
          onChange={(k, v) => setCreateForm(s => ({ ...s, [k]: v }))}
          coaches={coaches}
          allAvailabilities={availabilities}
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
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Availability">
        <AvailabilityForm
          form={editForm}
          errors={editErrors}
          onChange={(k, v) => setEditForm(s => ({ ...s, [k]: v }))}
          coaches={coaches}
          allAvailabilities={availabilities}
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

/* ---------------- UI Components ---------------- */

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-surface-600 bg-surface-800 p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', error, placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${
          error ? 'border-red-500' : 'border-surface-600'
        } focus:outline-none focus:border-brand-500`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

/** AvailabilityForm: Auto-sync is_available + info line */
function AvailabilityForm({ form, errors = {}, onChange, coaches = [], allAvailabilities = [] }) {
  const coachId = form.coach_id
  const day = (form.day_of_week || '').toLowerCase()
  const start = formatClock(form.start_time)
  const end = formatClock(form.end_time)

  // keep is_available synced with current selection
  useEffect(() => {
    const nowStatus = isNowInSlot(day, start, end)
    onChange('is_available', nowStatus)
  }, [day, start, end]) // eslint-disable-line react-hooks/exhaustive-deps

  const info = computeStatusInfo(coachId, day, start, end, allAvailabilities)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Coach */}
      <div className="space-y-1">
        <label className="text-sm text-gray-300">Coach</label>
        <select
          value={form.coach_id ?? ''}
          onChange={(e) => onChange('coach_id', e.target.value)}
          className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${
            errors.coach_id ? 'border-red-500' : 'border-surface-600'
          } focus:outline-none focus:border-brand-500`}
        >
          <option value="">Select a coach…</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.coach_id && <p className="text-xs text-red-400">{errors.coach_id}</p>}
      </div>

      {/* Day */}
      <div className="space-y-1">
        <label className="text-sm text-gray-300">Day of Week</label>
        <select
          value={day}
          onChange={(e) => onChange('day_of_week', e.target.value)}
          className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${
            errors.day_of_week ? 'border-red-500' : 'border-surface-600'
          } focus:outline-none focus:border-brand-500`}
        >
          <option value="">Select a day…</option>
          {daysOfWeek.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        {errors.day_of_week && <p className="text-xs text-red-400">{errors.day_of_week}</p>}
      </div>

      {/* Start */}
      <Input
        label="Start Time"
        type="time"
        value={start}
        onChange={(v) => onChange('start_time', v)}
        error={errors.start_time}
        placeholder="09:00"
      />

      {/* End */}
      <Input
        label="End Time"
        type="time"
        value={end}
        onChange={(v) => onChange('end_time', v)}
        error={errors.end_time}
        placeholder="17:00"
      />

      {/* Info line */}
      <div className="md:col-span-2">
        <p className="text-xs text-gray-300 mt-1">
          {info.now ? 'Available now' : info.label}
        </p>
      </div>
    </div>
  )
}
