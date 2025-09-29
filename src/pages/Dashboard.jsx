export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Overview</h1>

      <div className="p-6 rounded-2xl bg-brand-500 text-white shadow">
        Tailwind OK ✅ — cette carte utilise <b>bg-brand-500</b> (extend du config).
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500">Active Users</div>
          <div className="mt-2 text-3xl font-bold">1,284</div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500">Bookings</div>
          <div className="mt-2 text-3xl font-bold">342</div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500">Workouts Today</div>
          <div className="mt-2 text-3xl font-bold">76</div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500">Revenue</div>
          <div class="mt-2 text-3xl font-bold">$5,420</div>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="font-semibold mb-2">Recent Activity</div>
        <ul className="space-y-2 text-sm">
          <li>✅ User <b>salma.tn</b> booked <b>Yoga Flow</b></li>
          <li>🕒 Coach <b>Amine</b> set Monday availability</li>
          <li>🏋️ 3 new workouts added to <b>Downtown Branch</b></li>
        </ul>
      </section>
    </div>
  )
}