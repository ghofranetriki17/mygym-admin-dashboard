import { useEffect, useState } from 'react'

export default function Workouts() {
  const [items, setItems] = useState([])

  useEffect(() => {
    // Exemple: à brancher sur ton API Laravel: GET /api/workouts
    // fetch('/api/workouts', { headers: { Authorization: `Bearer ${token}` }})
    //   .then((r) => r.json())
    //   .then(setItems)
    setItems([
      { id: 1, title: 'Full Body A', exercises: 6 },
      { id: 2, title: 'Push Day', exercises: 5 },
      { id: 3, title: 'Legs Power', exercises: 7 },
    ])
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Workouts</h1>
        <button className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">New Workout</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((w) => (
          <div key={w.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="font-semibold">{w.title}</div>
            <div className="text-sm text-gray-500">{w.exercises} exercises</div>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">View</button>
              <button className="px-3 py-1.5 rounded-lg bg-brand-600 text-white">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}