import { useEffect, useRef, useState } from 'react'
import { LogOut, User, Settings } from 'lucide-react'

export default function AvatarMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-sm font-bold"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        G
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          <div className="px-4 py-3">
            <div className="text-sm font-semibold">Ghofrane</div>
            <div className="text-xs text-gray-500">admin@fimo.tn</div>
          </div>
          <div className="py-1 text-sm">
            <button className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
              <User className="h-4 w-4" /> Profile
            </button>
            <button className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Settings
            </button>
            <hr className="my-1 border-gray-200 dark:border-gray-800" />
            <button className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}