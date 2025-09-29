import { Moon, Sun, Bell, Search, PanelLeft, Menu } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import AvatarMenu from './atoms/AvatarMenu.jsx'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ onToggleSidebar, dark, onToggleDark }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const { logout } = useAuth()

  useEffect(() => {
    const handler = (e) => { if (!notifRef.current?.contains(e.target)) setNotifOpen(false) }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-surface-600 bg-surface-800/80 backdrop-blur">
      <div className="flex items-center gap-2 px-4 md:px-6 h-14">
        <button className="md:hidden p-2 rounded-lg hover:bg-surface-700" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <PanelLeft className="h-5 w-5" />
        </button>

        <div className="hidden md:flex items-center gap-2 text-brand-400 font-semibold">
          <Menu className="h-5 w-5" />
          <span>Admin Dashboard</span>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2 max-w-md w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-700 outline-none focus:ring-2 ring-brand-500 text-gray-100"
              placeholder="Search…"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2">
          <button className="p-2 rounded-lg hover:bg-surface-700" onClick={onToggleDark} aria-label="Toggle theme">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button className="p-2 rounded-lg hover:bg-surface-700 relative" onClick={() => setNotifOpen(o => !o)} aria-haspopup="menu" aria-expanded={notifOpen}>
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-brand-500 rounded-full" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-surface-600 bg-surface-800 shadow-lg overflow-hidden">
                <div className="px-4 py-2 text-sm font-semibold border-b border-surface-600">Notifications</div>
                <ul className="max-h-80 overflow-auto divide-y divide-surface-700">
                  <li className="p-3 text-sm hover:bg-surface-700">New booking confirmed for Session #102</li>
                  <li className="p-3 text-sm hover:bg-surface-700">Coach Amine updated availability</li>
                  <li className="p-3 text-sm hover:bg-surface-700">3 workouts completed today 🎉</li>
                </ul>
              </div>
            )}
          </div>

          <button onClick={logout} className="px-3 py-2 rounded-lg bg-brand-500 text-surface-900 font-semibold hover:bg-brand-400">
            Logout
          </button>

          <AvatarMenu />
        </div>
      </div>
    </header>
  )
}
