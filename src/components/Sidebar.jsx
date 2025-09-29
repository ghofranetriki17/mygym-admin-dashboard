import { NavLink, useLocation } from 'react-router-dom'
import {
  Dumbbell, Building2, Users, CalendarDays, LayoutDashboard,
  Settings, ChevronDown, Package, User, Wrench
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

const NAV = [
  { label: 'Dashboard', to: '/', icon: <LayoutDashboard className="h-4 w-4" /> },

/*  {
    label: 'Content',
    icon: <Package className="h-4 w-4" />,
    children: [
      { label: 'Categories', to: '/categories' },
      { label: 'Promotions', to: '/promotions' },
      { label: 'Shop Items', to: '/shop-items' },
      { label: 'Benefits', to: '/benefits' },
    ],
  },*/

/*  {
    label: 'Workouts',
    icon: <Dumbbell className="h-4 w-4" />,
    children: [
      { label: 'All Workouts', to: '/workouts' },
      { label: 'Create Workout', to: '/workouts/create' },
    ],
  },*/

  {
    label: 'Machines',
    icon: <Wrench className="h-4 w-4" />,
    children: [
      { label: 'All Machines', to: '/machines' },
      { label: 'Movements', to: '/movements' },
      { label: 'Charges', to: '/charges' },
    ],
  },

  {
    label: 'Branches',
    icon: <Building2 className="h-4 w-4" />,
    children: [
      { label: 'All Branches', to: '/branches' },
      { label: 'Create Branch', to: '/branches/create' },
    ],
  },
{
  label: 'Availabilities',
  to: '/availabilities',
  icon: <CalendarDays className="h-4 w-4" />,
}
,
  {
    label: 'Sessions',
    icon: <CalendarDays className="h-4 w-4" />,
    children: [
      { label: 'All Sessions', to: '/sessions' },
      { label: 'Sessions bookings', to: '/sessions/available' },
    ],
  },

 {
  label: 'Coaches',
  icon: <Users className="h-4 w-4" />,
  children: [
    { label: 'All Coaches', to: '/coaches' },
    { label: 'Coach Availabilities', to: '/coach-availabilities' },
  ],
},

  {
    label: 'Users',
    icon: <User className="h-4 w-4" />,
    children: [
      { label: 'All Users', to: '/users' },
      { label: 'Progress', to: '/user-progress' },
    ],
  },

  { label: 'Settings', to: '/settings', icon: <Settings className="h-4 w-4" /> },
]

export default function Sidebar({ open, onClose }) {
  const loc = useLocation()
  const [expanded, setExpanded] = useState({})
  const panelRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!panelRef.current?.contains(e.target)) onClose() }
    if (open) window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [open, onClose])

  useEffect(() => { onClose() }, [loc.pathname])

  const ItemLink = ({ to, children }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
          'hover:bg-surface-700',
          isActive && 'bg-surface-700 text-brand-400'
        )
      }
      end
    >
      {children}
    </NavLink>
  )

  return (
    <>
      <div className={clsx(
        'fixed inset-0 bg-black/30 z-30 md:hidden transition-opacity',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )} />

      <aside
        ref={panelRef}
        className={clsx(
          'fixed z-40 md:static md:translate-x-0 md:w-64',
          'inset-y-0 left-0 w-72 p-3',
          'bg-surface-800 border-r border-surface-600 text-gray-100',
          'transition-transform',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-14 px-2 flex items-center gap-2 border-b border-surface-600">
          <div className="h-8 w-8 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-400">F</div>
          <div className="font-semibold">Fimo Fitness Admin</div>
        </div>

        <nav className="mt-3 space-y-1">
          {NAV.map((item) => {
            if (item.children?.length) {
              const isOpen = expanded[item.label]
              const toggle = () => setExpanded((e) => ({ ...e, [item.label]: !e[item.label] }))

              return (
                <div key={item.label} className="px-2">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium hover:bg-surface-700"
                    onClick={toggle}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon}
                      {item.label}
                    </span>
                    <ChevronDown className={clsx('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  <div className={clsx('overflow-hidden transition-all', isOpen ? 'max-h-64' : 'max-h-0')}>
                    <div className="pl-9 py-1 space-y-1">
                      {item.children.map((c) => (
                        <ItemLink key={c.to} to={c.to}>{c.label}</ItemLink>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={item.label} className="px-2">
                <ItemLink to={item.to}>
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                </ItemLink>
              </div>
            )
          })}
        </nav>

      
      </aside>
    </>
  )
}
