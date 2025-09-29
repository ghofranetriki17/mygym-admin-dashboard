// src/pages/Machines.jsx
import { useEffect, useState, useMemo } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Edit, Trash2, Copy, Search, Image as ImageIcon } from 'lucide-react'
import { machinesAPI, categoriesAPI, branchesAPI, chargesAPI, machineChargeAPI } from '../services/api'

export default function Machines() {
  const [data, setData] = useState([])
  const [categories, setCategories] = useState([])
  const [branches, setBranches] = useState([])
  const [allCharges, setAllCharges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [expandedBranches, setExpandedBranches] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMachine, setEditingMachine] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    type: '',             // requis backend
    description: '',
    branch_id: '',
    category_ids: [],
    image_url: '',
    video_url: ''
  })

  // Gestion upload en cours
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Charges: uniquement IDs
  const [selectedChargeIds, setSelectedChargeIds] = useState([])
  const [newChargeName, setNewChargeName] = useState('')
  const [newChargeWeight, setNewChargeWeight] = useState('')

  // Duplicate modal
  const [selectedMachineForDuplicate, setSelectedMachineForDuplicate] = useState('')
  const [targetBranchId, setTargetBranchId] = useState('')

  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [machinesRes, categoriesRes, branchesRes, chargesRes] = await Promise.all([
        machinesAPI.list(),         // backend with('charges','categories','branch')
        categoriesAPI.list(),
        branchesAPI.list(),
        chargesAPI.list()
      ])
      setData(machinesRes.data || machinesRes || [])
      setCategories(categoriesRes.data || categoriesRes || [])
      setBranches(branchesRes.data || branchesRes || [])
      setAllCharges(chargesRes.data || chargesRes || [])
      setError('')
    } catch (e) {
      console.error('Error loading data:', e)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Search
  const filteredData = useMemo(() => {
    const q = (searchTerm || '').toLowerCase()
    return (data || []).filter(m => (m.name || '').toLowerCase().includes(q))
  }, [data, searchTerm])

  // Group by branch name
  const groupedMachines = useMemo(() => {
    return filteredData.reduce((acc, m) => {
      const key = m.branch?.name || 'Sans Branche'
      ;(acc[key] ||= []).push(m)
      return acc
    }, {})
  }, [filteredData])

  // Unique machines (by name) for duplicate
  const uniqueMachines = useMemo(() => {
    const seen = new Set()
    const arr = []
    for (const m of data) {
      if (!seen.has(m.name)) { seen.add(m.name); arr.push(m) }
    }
    return arr
  }, [data])

  const toggleBranch = (branchName) => {
    setExpandedBranches(prev => ({ ...prev, [branchName]: !prev[branchName] }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId]
    }))
  }

  const handleChargeToggle = (chargeId) => {
    setSelectedChargeIds(prev =>
      prev.includes(chargeId) ? prev.filter(id => id !== chargeId) : [...prev, chargeId]
    )
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const created = await categoriesAPI.create({ name: newCategoryName.trim() })
      const category = created.data || created
      setCategories(prev => [...prev, category])
      setFormData(prev => ({ ...prev, category_ids: [...prev.category_ids, category.id] }))
      setNewCategoryName('')
    } catch (e) {
      console.error('Failed to create category:', e)
      setError('Failed to create category')
    }
  }

  const addNewCharge = async () => {
    const name = newChargeName.trim()
    const weightStr = newChargeWeight.trim()
    if (!name && !weightStr) return

    try {
      const payload = {}
      if (name) payload.name = name
      if (weightStr !== '') payload.weight = parseFloat(weightStr)

      const created = await chargesAPI.create(payload)
      const charge = created.data || created
      setAllCharges(prev => [...prev, charge])
      setSelectedChargeIds(prev => [...prev, charge.id])
      setNewChargeName('')
      setNewChargeWeight('')
    } catch (e) {
      console.error('Failed to create charge:', e)
      setError('Failed to create charge')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      branch_id: '',
      category_ids: [],
      image_url: '',
      video_url: ''
    })
    setSelectedChargeIds([])
    setNewChargeName('')
    setNewChargeWeight('')
    setEditingMachine(null)
  }

  const handleEdit = (machine) => {
    setEditingMachine(machine)
    setFormData({
      name: machine.name || '',
      type: machine.type || '',
      description: machine.description || '',
      branch_id: machine.branch?.id || '',
      category_ids: machine.categories?.map(c => c.id) || [],
      image_url: machine.image_url || '',
      video_url: machine.video_url || ''
    })
    setSelectedChargeIds(machine.charges?.map(c => c.id) || [])
    setShowForm(true)
  }

  const handleDelete = async (machineId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette machine ?')) return
    try {
      await machinesAPI.delete(machineId)
      await loadData()
    } catch (e) {
      console.error('Failed to delete machine:', e)
      setError('Failed to delete machine')
    }
  }

  // === UPLOAD IMAGE ===
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fd = new FormData()
    fd.append('image', file)
    fd.append('folder', 'machines')

    try {
      setIsUploadingImage(true)

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          // ajoute ton bearer si ton endpoint est protégé
          ...(localStorage.getItem('token')
            ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
            : {}),
        },
        body: fd,
      })

      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Upload failed')
      }

      // On met à jour l’URL d’image du formulaire
      setFormData(prev => ({ ...prev, image_url: json.data.url }))
    } catch (err) {
      console.error('Image upload error:', err)
      alert('Erreur upload image : ' + (err?.message || ''))
    } finally {
      setIsUploadingImage(false)
    }
  }

  // ---- Persist charges (sync pivot) ----
  const persistChargesForMachine = async (machineId) => {
    await machineChargeAPI.sync(machineId, selectedChargeIds)
  }

const handleSubmit = async (e) => {
  e.preventDefault()
  if (!formData.name.trim() || !formData.branch_id || !formData.type.trim()) {
    setError('Name, Type et Salle sont requis.')
    return
  }

  try {
    setSubmitting(true)
    let saved = null

    // Prepare the complete payload including charges
    const payload = {
      ...formData,
      charge_ids: selectedChargeIds // Make sure to include charges in the payload
    }

    if (editingMachine) {
      const res = await machinesAPI.update(editingMachine.id, payload)
      saved = res?.data || res || editingMachine
    } else {
      const res = await machinesAPI.create(payload)
      saved = res?.data || res
    }

    const machineId = saved?.id ?? editingMachine?.id
    if (!machineId) throw new Error('No machine ID after save')

    // Also update the machine with the selected charges
    await persistChargesForMachine(machineId)

    await loadData()
    resetForm()
    setShowForm(false)
    setError('')
  } catch (e) {
    console.error('Failed to save machine:', e)
    
    // Handle validation errors specifically
    if (e?.response?.status === 422) {
      const validationErrors = e.response.data.errors
      let errorMessage = 'Validation errors: '
      
      // Format validation errors for display
      Object.keys(validationErrors).forEach(key => {
        errorMessage += `${key}: ${validationErrors[key].join(', ')}. `
      })
      
      setError(errorMessage)
    } else {
      const msg = e?.response?.data?.message || e?.response?.data?.error || 'Failed to save machine'
      setError(msg)
    }
  } finally {
    setSubmitting(false)
  }
}
  const handleDuplicate = async () => {
    if (!selectedMachineForDuplicate || !targetBranchId) return
    const originalMachine = data.find(m => String(m.id) === String(selectedMachineForDuplicate))
    if (!originalMachine) return

    const payload = {
      name: originalMachine.name,
      type: originalMachine.type || '',
      description: originalMachine.description,
      branch_id: targetBranchId,
      category_ids: originalMachine.categories?.map(c => c.id) || [],
      image_url: originalMachine.image_url,
      video_url: originalMachine.video_url
    }

    try {
      setSubmitting(true)
      const created = await machinesAPI.create(payload)
      const newMachine = created?.data || created

      const originalChargeIds = originalMachine.charges?.map(c => c.id) || []
      await machineChargeAPI.sync(newMachine.id, originalChargeIds)

      await loadData()
      setShowDuplicateModal(false)
      setSelectedMachineForDuplicate('')
      setTargetBranchId('')
      setError('')
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to duplicate machine'
      console.error('Failed to duplicate machine:', e?.response?.data || e)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-4">Chargement...</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Machines</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowDuplicateModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            Dupliquer
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle machine
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Rechercher une machine..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Machines grouped by branch */}
      <div className="space-y-4">
        {Object.entries(groupedMachines).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'Aucune machine trouvée pour cette recherche.' : 'Aucune machine disponible.'}
          </div>
        ) : (
          Object.entries(groupedMachines).map(([branchName, machines]) => (
            <div key={branchName} className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => toggleBranch(branchName)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
              >
                <h2 className="text-lg font-semibold text-gray-900">
                  {branchName} ({machines.length} machine{machines.length > 1 ? 's' : ''})
                </h2>
                {expandedBranches[branchName] ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedBranches[branchName] && (
                <div className="border-t">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-900">ID</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-900">Image</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-900">Nom</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-900">Type</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-900">Description</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-900">Catégories</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-900">Charges</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {machines.map(machine => (
                          <tr key={machine.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">{machine.id}</td>
                            <td className="px-4 py-3">
                              {machine.image_url ? (
                                <img
                                  src={machine.image_url}
                                  alt={machine.name}
                                  className="w-14 h-14 rounded object-cover border"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded border flex items-center justify-center text-gray-400">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{machine.name}</td>
                            <td className="px-4 py-3 text-gray-600">{machine.type || '-'}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {machine.description ? (
                                machine.description.length > 50
                                  ? machine.description.substring(0, 50) + '...'
                                  : machine.description
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3">
                              {machine.categories?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {machine.categories.map(category => (
                                    <span
                                      key={category.id}
                                      className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                    >
                                      {category.name}
                                    </span>
                                  ))}
                                </div>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-4 py-3">
                              {machine.charges?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {machine.charges.slice(0, 5).map((c) => (
                                    <span
                                      key={c.id}
                                      className="inline-block px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full"
                                    >
                                      {c.weight != null ? `${c.weight} kg` : (c.name || '—')}
                                    </span>
                                  ))}
                                  {machine.charges.length > 5 && (
                                    <span className="text-xs text-gray-500">+{machine.charges.length - 5}</span>
                                  )}
                                </div>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(machine)}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(machine.id)}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Dupliquer une machine</h2>
                <button onClick={() => setShowDuplicateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner une machine à dupliquer</label>
                  <select
                    value={selectedMachineForDuplicate}
                    onChange={(e) => setSelectedMachineForDuplicate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choisir une machine</option>
                    {uniqueMachines.map(machine => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name} ({machine.branch?.name || 'Sans branche'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branche de destination</label>
                  <select
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner une salle</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                <button onClick={() => setShowDuplicateModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                  Annuler
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={!selectedMachineForDuplicate || !targetBranchId || submitting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
                >
                  {submitting ? 'Duplication...' : 'Dupliquer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingMachine ? 'Modifier la machine' : 'Ajouter une nouvelle machine'}
                </h2>
                <button onClick={() => { setShowForm(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la machine *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                    <input
                      type="text"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salle de sport *</label>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner une salle</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Image upload + preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image *</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    {isUploadingImage && (
                      <div className="mt-1 text-xs text-gray-500">Upload en cours…</div>
                    )}
                  </div>

                    {/* Afficher l’URL en lecture (non obligatoire) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL de l'image (lecture)</label>
                    <input
                      type="url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      placeholder="Rempli automatiquement après upload"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {formData.image_url && (
                  <div className="flex items-center gap-3">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="h-24 w-24 rounded object-cover border"
                    />
                    <span className="text-xs text-gray-500 break-all">{formData.image_url}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL de la vidéo</label>
                  <input
                    type="url"
                    name="video_url"
                    value={formData.video_url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégories</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.category_ids.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nouvelle catégorie..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Charges */}
                <div className="pt-2 border-t">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Charges pour cette machine</label>

                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {allCharges.map(charge => (
                      <label key={charge.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedChargeIds.includes(charge.id)}
                          onChange={() => handleChargeToggle(charge.id)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {charge.weight != null ? `${charge.weight} kg` : (charge.name || 'Charge sans nom')}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Add a new charge */}
                  <div className="mt-3">
                    <span className="block text-xs text-gray-500 mb-1">Ajouter une nouvelle charge</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newChargeName}
                        onChange={(e) => setNewChargeName(e.target.value)}
                        placeholder="Nom (optionnel)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        step="0.5"
                        value={newChargeWeight}
                        onChange={(e) => setNewChargeWeight(e.target.value)}
                        placeholder="Poids (kg)"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={addNewCharge}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                        title="Ajouter la charge"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm() }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || isUploadingImage}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {submitting ? (editingMachine ? 'Modification...' : 'Création...') : (editingMachine ? 'Modifier' : 'Créer la machine')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
