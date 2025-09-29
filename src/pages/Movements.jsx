import { useEffect, useMemo, useState } from 'react'
import { movementAPI } from '../services/movementAPI'
import clsx from 'clsx'

const emptyForm = { name: '', description: '', video_url: '', mediaFile: null }

export default function Movements() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 5

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [createErrors, setCreateErrors] = useState({})
  const [creating, setCreating] = useState(false)

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editErrors, setEditErrors] = useState({})
  const [updating, setUpdating] = useState(false)
  const [removeMedia, setRemoveMedia] = useState(false)

  // Delete state
  const [deleting, setDeleting] = useState(null) // ID of movement being deleted

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await movementAPI.list()
      setRows(data)
    } catch (e) {
      console.error('Failed to load movements:', e)
      setError('Failed to load movements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(m =>
      [m.name, m.description].some(v => (v || '').toLowerCase().includes(q))
    )
  }, [rows, search])

  const totalPages = Math.ceil(filtered.length / perPage) || 1
  const pageSafe = Math.min(Math.max(1, page), totalPages)
  const paginated = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage)

  // Create
  const openCreate = () => {
    setCreateForm(emptyForm)
    setCreateErrors({})
    setCreateOpen(true)
  }
  
  const submitCreate = async () => {
    setCreateErrors({})
    const errs = {}
    if (!createForm.name) errs.name = 'Required'
    if (createForm.mediaFile && createForm.video_url) errs.video_url = 'Choose file OR video url, not both'
    if (Object.keys(errs).length) { setCreateErrors(errs); return }

    setCreating(true)
    try {
      const newMovement = await movementAPI.create(createForm)
      setCreateOpen(false)
      setCreateForm(emptyForm)
      // Add the new movement to the list instead of reloading everything
      setRows(prevRows => [newMovement, ...prevRows])
    } catch (e) {
      console.error('Create failed:', e)
      const apiErrs = e?.response?.data?.errors || {}
      const mapped = Object.fromEntries(Object.entries(apiErrs).map(([k,v]) => [k, Array.isArray(v) ? v[0] : (v || 'Invalid')]))
      setCreateErrors(mapped)
    } finally {
      setCreating(false)
    }
  }

  // FIXED: Edit function with proper data handling
  const openEdit = async (id) => {
    setEditErrors({})
    setRemoveMedia(false)
    setEditId(id)
    try {
      const m = await movementAPI.get(id)
      // FIXED: Properly populate the form with existing data
      setEditForm({ 
        name: m.name || '', 
        description: m.description || '', 
        video_url: m.video_url || '', 
        mediaFile: null, // Always null for new uploads
        media_url: m.media_url || '', // Keep track of existing media
        media_type: m.media_type || '' 
      })
      setEditOpen(true)
    } catch (e) {
      console.error('Failed to load movement:', e)
      alert('Failed to load movement')
    }
  }
  
  const submitEdit = async () => {
    if (!editId) return
    
    setEditErrors({})
    const errs = {}
    if (!editForm.name) errs.name = 'Required'
    if (editForm.mediaFile && editForm.video_url) errs.video_url = 'Choose file OR video url, not both'
    if (Object.keys(errs).length) { setEditErrors(errs); return }

    setUpdating(true)
    try {
      const updatedMovement = await movementAPI.update(editId, {
        name: editForm.name,
        description: editForm.description,
        video_url: editForm.video_url,
        mediaFile: editForm.mediaFile,
        remove_media: removeMedia,
      })
      setEditOpen(false)
      setEditId(null)
      setRemoveMedia(false)
      // Update the specific movement in the list
      setRows(prevRows => prevRows.map(row => row.id === editId ? updatedMovement : row))
    } catch (e) {
      console.error('Update failed:', e)
      const apiErrs = e?.response?.data?.errors || {}
      const mapped = Object.fromEntries(Object.entries(apiErrs).map(([k,v]) => [k, Array.isArray(v) ? v[0] : (v || 'Invalid')]))
      setEditErrors(mapped)
    } finally {
      setUpdating(false)
    }
  }

  // ENHANCED DEBUG VERSION FOR DELETE
// BULLETPROOF DELETE HANDLER for your React component
const handleDelete = async (id) => {
  const movement = rows.find(m => m.id === id)
  const movementName = movement?.name || `Movement #${id}`
  
  console.log('🎯 Starting delete process for:', { id, movementName })
  
  if (!window.confirm(`Are you sure you want to delete "${movementName}"? This action cannot be undone.`)) {
    console.log('❌ Delete cancelled by user')
    return
  }
  
  // Store original state for rollback
  const originalRows = [...rows]
  
  setDeleting(id)
  try {
    console.log('🚀 Calling API to delete movement', id)
    
    // Optimistically update UI first
    setRows(prevRows => {
      const newRows = prevRows.filter(x => x.id !== id)
      console.log('🔄 Optimistic UI update complete:', newRows.length, 'movements remaining')
      return newRows
    })
    
    const response = await movementAPI.remove(id)
    console.log('📨 Delete API response:', response)
    
    // Check if deletion actually failed
    if (response && response.success === false) {
      console.error('❌ Server reported deletion failed, rolling back UI')
      setRows(originalRows) // Rollback UI
      alert(response.message || 'Failed to delete movement')
      return
    }
    
    console.log('✅ Delete confirmed successful')
    alert(`Movement "${movementName}" deleted successfully`)
    
    // Force refresh from server to ensure consistency
    setTimeout(() => {
      console.log('🔄 Refreshing data from server...')
      load() // Your existing load function
    }, 500)
    
  } catch (error) {
    console.error('💥 Delete operation failed:', error)
    
    // Rollback the optimistic update
    console.log('⏪ Rolling back UI state due to error')
    setRows(originalRows)
    
    // Handle specific error cases
    let errorMessage = 'Failed to delete movement'
    
    if (error?.response?.status === 422) {
      errorMessage = 'Cannot delete this movement because it is being used by exercises. Please remove the related exercises first.'
    } else if (error?.response?.status === 401) {
      errorMessage = 'Unauthorized. Please login again.'
      // Optionally redirect to login
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    console.error('📝 Final error message:', errorMessage)
    alert(errorMessage)
    
  } finally {
    console.log('🏁 Delete process finished, clearing loading state')
    setDeleting(null)
  }
}

  if (loading) return <div className="p-4">Loading…</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold">Movements</h1>
        <button 
          onClick={openCreate} 
          className="px-4 py-2 rounded-lg bg-brand-500 text-surface-900 font-semibold"
        >
          + Add Movement
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-surface-800 px-4 py-2 text-white"
          placeholder="Search by name or description…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-600">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-700">
            <tr>
              <th className="text-left px-4 py-2">#</th>
              <th className="text-left px-4 py-2">Media</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Description</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(m => (
              <tr key={m.id} className="border-t border-surface-700">
                <td className="px-4 py-2">{m.id}</td>
                <td className="px-4 py-2">
                  {m.media_url
                    ? (m.media_type === 'image'
                        ? <img src={m.media_url} alt="" className="h-10 w-10 object-cover rounded" />
                        : <a href={m.media_url} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">View video</a>)
                    : (m.video_url
                        ? <a href={m.video_url} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">View video</a>
                        : <span className="text-gray-400">—</span>)
                  }
                </td>
                <td className="px-4 py-2">{m.name}</td>
                <td className="px-4 py-2">{m.description ? (m.description.length > 80 ? m.description.slice(0,80) + '…' : m.description) : '—'}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button 
                    onClick={() => openEdit(m.id)} 
                    className="bg-yellow-500 text-black px-3 py-1 rounded-lg disabled:opacity-50"
                    disabled={deleting === m.id}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(m.id)} 
                    className="bg-red-600 text-white px-3 py-1 rounded-lg disabled:opacity-50"
                    disabled={deleting === m.id}
                  >
                    {deleting === m.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
            {!paginated.length && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No movements found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={clsx('px-3 py-1 rounded-lg', pageSafe === (i + 1) ? 'bg-brand-500 text-surface-900' : 'bg-surface-700 text-gray-300')}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* CREATE MODAL */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Movement">
        <MovementForm
          form={createForm}
          errors={createErrors}
          onChange={(k,v)=>setCreateForm(s=>({...s,[k]:v}))}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-700 text-white" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="px-4 py-2 rounded-lg bg-brand-500 text-surface-900 font-semibold" onClick={submitCreate} disabled={creating}>
            {creating ? 'Saving…' : 'Create'}
          </button>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Movement">
        <MovementForm
          form={editForm}
          errors={editErrors}
          onChange={(k,v)=>setEditForm(s=>({...s,[k]:v}))}
          allowRemove
          removeMedia={removeMedia}
          onToggleRemove={() => setRemoveMedia(v => !v)}
          currentMediaUrl={editForm.media_url}
          currentMediaType={editForm.media_type}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-700 text-white" onClick={() => setEditOpen(false)}>Cancel</button>
          <button className="px-4 py-2 rounded-lg bg-brand-500 text-surface-900 font-semibold" onClick={submitEdit} disabled={updating}>
            {updating ? 'Updating…' : 'Update'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-surface-800 p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center" aria-label="Close">
              ✕
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

function MovementForm({
  form, errors = {}, onChange,
  allowRemove = false, removeMedia = false, onToggleRemove,
  currentMediaUrl, currentMediaType,
}) {
  const onFile = (e) => {
    const file = e.target.files?.[0]
    onChange('mediaFile', file || null)
    if (file) onChange('video_url', '') // avoid both at once
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="space-y-1">
        <label className="text-sm text-gray-300">Name</label>
        <input
          value={form.name || ''}
          onChange={e=>onChange('name', e.target.value)}
          className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${errors.name ? 'border-red-500' : 'border-surface-600'} focus:outline-none focus:border-brand-500`}
          placeholder="Name"
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-gray-300">Description</label>
        <textarea
          rows={4}
          value={form.description || ''}
          onChange={e=>onChange('description', e.target.value)}
          className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${errors.description ? 'border-red-500' : 'border-surface-600'} focus:outline-none focus:border-brand-500`}
          placeholder="Description"
        />
        {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-gray-300">Upload image/video (file)</label>
        <input type="file" accept="image/*,video/*" onChange={onFile} className="block w-full text-sm text-gray-300" />
        {form.mediaFile && (
          <div className="text-xs text-gray-400 mt-1">
            Selected: {form.mediaFile.name} ({Math.round(form.mediaFile.size/1024)} KB)
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-gray-300">Or Video URL</label>
        <input
          type="url"
          value={form.video_url || ''}
          onChange={e=>onChange('video_url', e.target.value)}
          className={`w-full rounded-lg bg-surface-700 px-3 py-2 text-white border ${errors.video_url ? 'border-red-500' : 'border-surface-600'} focus:outline-none focus:border-brand-500`}
          placeholder="https://…"
        />
        {errors.video_url && <p className="text-xs text-red-400">{errors.video_url}</p>}
        {form.mediaFile && form.video_url && (
          <p className="text-xs text-yellow-400 mt-1">Choose file OR URL — both will conflict.</p>
        )}
      </div>

      {currentMediaUrl && (
        <div className="mt-2 space-y-2">
          <div className="text-sm text-gray-300">Current media:</div>
          {currentMediaType === 'image'
            ? <img src={currentMediaUrl} alt="" className="h-20 w-20 object-cover rounded" />
            : <a href={currentMediaUrl} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">View video</a>}
          {allowRemove && (
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={removeMedia} onChange={onToggleRemove} />
              Remove media
            </label>
          )}
        </div>
      )}
    </div>
  )
}