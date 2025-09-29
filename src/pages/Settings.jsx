export default function Settings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="font-semibold">API</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="text-gray-500 mb-1">Base URL</div>
            <input
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
              defaultValue="http://localhost:8000/api"
            />
          </label>
          <label className="text-sm">
            <div className="text-gray-500 mb-1">Token</div>
            <input
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
              placeholder="Paste your Sanctum token"
            />
          </label>
        </div>
        <div className="mt-4">
          <button className="px-3 py-2 rounded-lg bg-brand-600 text-white">Save</button>
        </div>
      </div>
    </div>
  )
}