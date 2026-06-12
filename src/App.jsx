import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { clientAuth, masterAuth } from './lib/auth'
import { beautyMasterAuth } from './lib/beautyAuth'
import BottomNav from './components/BottomNav'
import InstallPrompt from './components/InstallPrompt'

// ── Barber client ────────────────────────────────────────────
import ClientLogin from './pages/client/ClientLogin'
import ClientRegister from './pages/client/ClientRegister'
import MasterLink from './pages/client/MasterLink'
import Home from './pages/client/Home'
import SalonPage from './pages/client/SalonPage'
import MasterPage from './pages/client/MasterPage'
import BookingPage from './pages/client/BookingPage'
import MyBookings from './pages/client/MyBookings'
import Profile from './pages/client/Profile'

// ── Barber master ────────────────────────────────────────────
import MasterLogin from './pages/master/MasterLogin'
import MasterRegister from './pages/master/MasterRegister'
import MasterSchedule from './pages/master/MasterSchedule'
import MasterProfile from './pages/master/MasterProfile'

// ── Beauty master ────────────────────────────────────────────
import BeautyMasterLogin from './pages/beauty/master/BeautyMasterLogin'
import BeautyMasterRegister from './pages/beauty/master/BeautyMasterRegister'
import BeautyDashboard from './pages/beauty/master/BeautyDashboard'
import BeautyProfile from './pages/beauty/master/BeautyProfile'
import BeautyPortfolio from './pages/beauty/master/BeautyPortfolio'

// ── Beauty client (public, no auth) ─────────────────────────
import MasterPublicPage from './pages/beauty/client/MasterPublicPage'
import BeautyBooking from './pages/beauty/client/BeautyBooking'

// ── Guards ───────────────────────────────────────────────────
function ClientGuard({ children }) {
  if (!clientAuth.current()) return <Navigate to="/login" replace />
  return children
}
function MasterGuard({ children }) {
  if (!masterAuth.current()) return <Navigate to="/pro/login" replace />
  return children
}
function BeautyMasterGuard({ children }) {
  if (!beautyMasterAuth.current()) return <Navigate to="/beauty/pro/login" replace />
  return children
}

const BEAUTY_AUTH_PATHS = ['/beauty/pro/login', '/beauty/pro/register']
const BARBER_AUTH_PATHS = ['/login', '/register', '/pro/login', '/pro/register']

function Shell() {
  const location = useLocation()
  const path = location.pathname
  const isBarberAuth = BARBER_AUTH_PATHS.includes(path)
  const isBeautyAuth = BEAUTY_AUTH_PATHS.includes(path)
  const isPublicBeauty = path.startsWith('/b/')
  const isBeautyPro = path.startsWith('/beauty/pro')
  const isBarberPro = path.startsWith('/pro')
  const isAnyAuth = isBarberAuth || isBeautyAuth

  return (
    <>
      <Routes>
        {/* ── Barber client ── */}
        <Route path="/login" element={<ClientLogin />} />
        <Route path="/register" element={<ClientRegister />} />
        <Route path="/m/:id" element={<MasterLink />} />
        <Route path="/" element={<ClientGuard><Home /></ClientGuard>} />
        <Route path="/salon/:id" element={<ClientGuard><SalonPage /></ClientGuard>} />
        <Route path="/master/:id" element={<ClientGuard><MasterPage /></ClientGuard>} />
        <Route path="/booking/:masterId" element={<ClientGuard><BookingPage /></ClientGuard>} />
        <Route path="/bookings" element={<ClientGuard><MyBookings /></ClientGuard>} />
        <Route path="/profile" element={<ClientGuard><Profile /></ClientGuard>} />

        {/* ── Barber master ── */}
        <Route path="/pro/login" element={<MasterLogin />} />
        <Route path="/pro/register" element={<MasterRegister />} />
        <Route path="/pro" element={<MasterGuard><MasterSchedule /></MasterGuard>} />
        <Route path="/pro/profile" element={<MasterGuard><MasterProfile /></MasterGuard>} />

        {/* ── Beauty master pro ── */}
        <Route path="/beauty/pro/login" element={<BeautyMasterLogin />} />
        <Route path="/beauty/pro/register" element={<BeautyMasterRegister />} />
        <Route path="/beauty/pro" element={<BeautyMasterGuard><BeautyDashboard /></BeautyMasterGuard>} />
        <Route path="/beauty/pro/profile" element={<BeautyMasterGuard><BeautyProfile /></BeautyMasterGuard>} />
        <Route path="/beauty/pro/portfolio" element={<BeautyMasterGuard><BeautyPortfolio /></BeautyMasterGuard>} />

        {/* ── Beauty public (no auth) ── */}
        <Route path="/b/:masterId" element={<MasterPublicPage />} />
        <Route path="/b/:masterId/book" element={<BeautyBooking />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAnyAuth && !isPublicBeauty && <BottomNav />}
      {!isAnyAuth && !isBarberPro && !isBeautyPro && !isPublicBeauty && <InstallPrompt />}
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
