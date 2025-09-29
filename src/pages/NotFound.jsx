import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="text-7xl">🤷‍♀️</div>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="text-gray-500 mt-1">The page you’re looking for doesn’t exist.</p>
      <Link
        to="/"
        className="mt-4 inline-block px-4 py-2 rounded-lg bg-brand-600 text-white"
      >
        Back to dashboard
      </Link>
    </div>
  )
}