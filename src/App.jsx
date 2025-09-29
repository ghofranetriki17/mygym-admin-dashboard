import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Workouts from './pages/Workouts.jsx'
import Branches from './pages/Branches.jsx'
import Sessions from './pages/Sessions.jsx'
import Coaches from './pages/Coaches.jsx'
import CoachAvailabilities from "./pages/CoachAvailabilities.jsx"
import Settings from './pages/Settings.jsx'
import NotFound from './pages/NotFound.jsx'
import Availabilities from './pages/Availabilities.jsx' // ✅ Import here

import Categories from './pages/Categories.jsx'
import Promotions from './pages/Promotions.jsx'
import ShopItems from './pages/ShopItems.jsx'
import Benefits from './pages/Benefits.jsx'
import CreateWorkout from './pages/CreateWorkout.jsx'
import CreateBranch from './pages/CreateBranch.jsx'
import UpcomingSessions from './pages/UpcomingSessions.jsx'
import AvailableSessions from './pages/AvailableSessions.jsx'
import Users from './pages/Users.jsx'
import UserProgress from './pages/UserProgress.jsx'
import Machines from './pages/Machines.jsx'
import Movements from './pages/Movements.jsx'
import Charges from './pages/Charges.jsx'

import Auth from './pages/Auth.jsx'
import AdminRoute from './routes/AdminRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/auth" element={<Auth />} />

        {/* Admin-only */}
        <Route element={<AdminRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />

            {/* Content */}
            <Route path="categories" element={<Categories />} />
            <Route path="promotions" element={<Promotions />} />
            <Route path="shop-items" element={<ShopItems />} />
            <Route path="benefits" element={<Benefits />} />

            {/* Workouts */}
            <Route path="workouts" element={<Workouts />} />
            <Route path="workouts/create" element={<CreateWorkout />} />

            {/* Machines */}
            <Route path="machines" element={<Machines />} />
            <Route path="movements" element={<Movements />} />
            <Route path="charges" element={<Charges />} />

            {/* Branches */}
            <Route path="branches" element={<Branches />} />
            <Route path="branches/create" element={<CreateBranch />} />

            {/* Availabilities */}
            <Route path="availabilities" element={<Availabilities />} />

            {/* Sessions */}
            <Route path="sessions" element={<Sessions />} />
            <Route path="sessions/upcoming" element={<UpcomingSessions />} />
            <Route path="sessions/available" element={<AvailableSessions />} />

            {/* Users */}
            <Route path="users" element={<Users />} />
            <Route path="user-progress" element={<UserProgress />} />

            {/* Coaches */}
            <Route path="coaches" element={<Coaches />} />
<Route path="coach-availabilities" element={<CoachAvailabilities />} />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />
            <Route path="home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
