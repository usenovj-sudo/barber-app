import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { clientAuth, masterAuth } from './lib/auth'
import BottomNav from './components/BottomNav'

// Client
import ClientLogin from './pages/client/ClientLogin'
import ClientRegister from './pages/client/ClientRegister'
import MasterLink from './pages/client/MasterLink'
import InstallPrompt from './components/InstallPrompt'
import Home from './pages/client/Home'
import SalonPage from './pages/client/SalonPage'
import MasterPage from './pages/client/MasterPage'
import BookingPage from './pages/client/BookingPage'
import MyBookings from './pages/client/MyBookings'
import Profile from './pages/client/Profile'

// Master
import MasterLogin from './pages/master/MasterLogin'
import MasterRegister from './pages/master/MasterRegister'
import MasterSchedule from './pages/master/MasterSchedule'
import MasterProfile from './pages/master/MasterProfile'

function ClientGuard({ children }) {
  if (!clientAuth.current()) return <Navigate to="/login" replace />
  return children
}
function MasterGuard({ children }) {
  if (!masterAuth.current()) return <Navigate to="/pro/login" replace />
  return children
}

function Shell() {
  const location = useLocation()
  const path = location.pathname
  const isAuthPage = ['/login', '/register', '/pro/login', '/pro/register'].includes(path)

  return (
    <>
      <Routes>
        {/* Клиентское приложение */}
        <Route path="/login" element={<ClientLogin />} />
        <Route path="/register" element={<ClientRegister />} />
        <Route path="/m/:id" element={<MasterLink />} />
        <Route path="/" element={<ClientGuard><Home /></ClientGuard>} />
        <Route path="/salon/:id" element={<ClientGuard><SalonPage /></ClientGuard>} />
        <Route path="/master/:id" element={<ClientGuard><MasterPage /></ClientGuard>} />
        <Route path="/booking/:masterId" element={<ClientGuard><BookingPage /></ClientGuard>} />
        <Route path="/bookings" element={<ClientGuard><MyBookings /></ClientGuard>} />
        <Route path="/profile" element={<ClientGuard><Profile /></ClientGuard>} />

        {/* Приложение мастера (Про) */}
        <Route path="/pro/login" element={<MasterLogin />} />
        <Route path="/pro/register" element={<MasterRegister />} />
        <Route path="/pro" element={<MasterGuard><MasterSchedule /></MasterGuard>} />
        <Route path="/pro/profile" element={<MasterGuard><MasterProfile /></MasterGuard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAuthPage && <BottomNav />}
      {!isAuthPage && !path.startsWith('/pro') && <InstallPrompt />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
