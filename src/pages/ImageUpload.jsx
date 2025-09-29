// Composant d'upload d'image à ajouter dans votre formulaire machines
import { useState, useRef } from 'react'
import { Upload, X, Eye } from 'lucide-react'

const ImageUpload = ({ value, onChange, label = "Image de la machine" }) => {
  const [preview, setPreview] = useState(value || '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validation du type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide')
      return
    }

    // Validation de la taille (ex: 5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier est trop volumineux (max 5MB)')
      return
    }

    try {
      setUploading(true)
      
      // Créer FormData pour l'upload
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'machines') // Organiser par dossiers

      // Upload vers votre API
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // Si auth nécessaire
        }
      })

      if (!response.ok) {
        throw new Error('Échec de l\'upload')
      }

      const result = await response.json()
      const imageUrl = result.url || result.data?.url

      // Mettre à jour le preview et la valeur
      setPreview(imageUrl)
      onChange(imageUrl)

    } catch (error) {
      console.error('Erreur upload:', error)
      alert('Erreur lors de l\'upload de l\'image')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreview('')
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUrlInput = (url) => {
    setPreview(url)
    onChange(url)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {/* Zone d'upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        {preview ? (
          /* Aperçu de l'image */
          <div className="relative">
            <img 
              src={preview} 
              alt="Aperçu" 
              className="w-full h-48 object-cover rounded-lg"
              onError={() => setPreview('')}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={() => window.open(preview, '_blank')}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                title="Voir en grand"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                title="Supprimer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Zone de drop/sélection */
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Upload en cours...' : 'Sélectionner une image'}
              </button>
              <p className="text-sm text-gray-500">
                ou glissez-déposez votre image ici
              </p>
              <p className="text-xs text-gray-400">
                PNG, JPG, JPEG jusqu'à 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Option URL manuelle */}
      <div className="pt-2 border-t border-gray-200">
        <label className="block text-xs text-gray-500 mb-1">
          Ou saisissez une URL d'image directement :
        </label>
        <input
          type="url"
          value={value || ''}
          onChange={(e) => handleUrlInput(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

// Utilisation dans votre formulaire machines existant :

// Dans le JSX de votre formulaire, remplacez le champ image_url par :
/*
<ImageUpload
  value={formData.image_url}
  onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
  label="Image de la machine"
/>
*/

export default ImageUpload