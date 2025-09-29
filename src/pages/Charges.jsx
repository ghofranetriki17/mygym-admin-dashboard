import { useEffect, useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Edit, Trash2, Copy, Search } from 'lucide-react'
import { machinesAPI, categoriesAPI, branchesAPI, chargesAPI } from '../services/api'

export default function Machines() {
  const [data, setData] = useState([])
  const [categories, setCategories] = useState([])
  const [branches, setBranches] = useState([])
  const [charges, setCharges] = useState([]) // NEW
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [expandedBranches, setExpandedBranches] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMachine, setEditingMachine] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    branch_id: '',
    category_ids: [],
    charge_ids: [], // NEW
    image_url: '',
    video_url: ''
  })

  const [selectedMachineForDuplicate, setSelectedMachineForDuplicate] = useState('')
  const [targetBranchId, setTargetBranchId] = useState('')

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newChargeName, setNewChargeName] = useState('') // NEW
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [machinesRes, categoriesRes, branchesRes, chargesRes] = await Promise.all([
        machinesAPI.list(),
        categoriesAPI.list(),
        branchesAPI.list(),
        chargesAPI.list()
      ])

      setData(machinesRes.data || machinesRes || [])
      setCategories(categoriesRes.data || categoriesRes || [])
      setBranches(branchesRes.data || branchesRes || [])
      setCharges(chargesRes.data || chargesRes || [])
    } catch (e) {
      console.error('Error loading data:', e)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredData = data.filter(machine =>
    machine.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedMachines = filteredData.reduce((acc, machine) => {
    const branchName = machine.branch?.name || 'Sans Branche'
    if (!acc[branchName]) acc[branchName] = []
    acc[branchName].push(machine)
    return acc
  }, {})

  const uniqueMachines = data.reduce((acc, machine) => {
    if (!acc.find(m => m.name === machine.name)) acc.push(machine)
    return acc
  }, [])

  const toggleBranch = (branchName) => {
    setExpandedBranches(prev => ({
      ...prev,
      [branchName]: !prev[branchName]
    }))
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

  const handleChargeToggle = (chargeId) => { // NEW
    setFormData(prev => ({
      ...prev,
      charge_ids: prev.charge_ids.includes(chargeId)
        ? prev.charge_ids.filter(id => id !== chargeId)
        : [...prev.charge_ids, chargeId]
    }))
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const response = await categoriesAPI.create({ name: newCategoryName.trim() })
      const newCategory = response.data || response
      setCategories(prev => [...prev, newCategory])
      setFormData(prev => ({
        ...prev,
        category_ids: [...prev.category_ids, newCategory.id]
      }))
      setNewCategoryName('')
    } catch (e) {
      console.error('Failed to create category:', e)
      setError('Failed to create category')
    }
  }

  const handleAddCharge = async () => { // NEW
    if (!newChargeName.trim()) return
    try {
      const response = await chargesAPI.create({ name: newChargeName.trim() })
      const newCharge = response.data || response
      setCharges(prev => [...prev, newCharge])
      setFormData(prev => ({
        ...prev,
        charge_ids: [...prev.charge_ids, newCharge.id]
      }))
      setNewChargeName('')
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
      charge_ids: [],
      image_url: '',
      video_url: ''
    })
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
      charge_ids: machine.charges?.map(ch => ch.id) || [], // NEW
      image_url: machine.image_url || '',
      video_url: machine.video_url || ''
    })
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.branch_id) return
    try {
      setSubmitting(true)
      if (editingMachine) {
        await machinesAPI.update(editingMachine.id, formData)
      } else {
        await machinesAPI.create(formData)
      }
      await loadData()
      resetForm()
      setShowForm(false)
    } catch (e) {
      console.error('Failed to save machine:', e)
      setError('Failed to save machine')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDuplicate = async () => {
    if (!selectedMachineForDuplicate || !targetBranchId) return
    const originalMachine = data.find(m => m.id == selectedMachineForDuplicate)
    if (!originalMachine) return
    const duplicateData = {
      name: originalMachine.name,
      type: originalMachine.type,
      description: originalMachine.description,
      branch_id: targetBranchId,
      category_ids: originalMachine.categories?.map(c => c.id) || [],
      charge_ids: originalMachine.charges?.map(ch => ch.id) || [], // NEW
      image_url: originalMachine.image_url,
      video_url: originalMachine.video_url
    }
    try {
      setSubmitting(true)
      await machinesAPI.create(duplicateData)
      await loadData()
      setShowDuplicateModal(false)
      setSelectedMachineForDuplicate('')
      setTargetBranchId('')
    } catch (e) {
      console.error('Failed to duplicate machine:', e)
      setError('Failed to duplicate machine')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-4">Chargement...</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>

  return (
    <div className="space-y-6 p-6">
      {/* ... same header/search/table code as before ... */}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* ... same header ... */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* ... name/type/branch/desc/img/video fields ... */}

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégories
                  </label>
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
                    <button type="button" onClick={handleAddCategory}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Charges */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Charges
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {charges.map(charge => (
                      <label key={charge.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.charge_ids.includes(charge.id)}
                          onChange={() => handleChargeToggle(charge.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {charge.name ?? `${charge.weight ?? '-'} kg`}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newChargeName}
                      onChange={(e) => setNewChargeName(e.target.value)}
                      placeholder="Nouvelle charge..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button type="button" onClick={handleAddCharge}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                    Annuler
                  </button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50">
                    {submitting ? (editingMachine ? 'Modification...' : 'Création...') :
                      (editingMachine ? 'Modifier' : 'Créer la machine')}
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
