import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { store } from './lib/store'
import BottomNav from './components/BottomNav'

// Client pages
import Home from './pages/client/Home'
import SalonPage from './pages/client/SalonPage'
import MasterPage from './pages/client/MasterPage'
import BookingPage from './pages/client/BookingPage'
import MyBookings from './pages/client/MyBookings'
import Profile from './pages/client/Profile'

// Master pages
import MasterSchedule from './pages/master/MasterSchedule'
import MasterProfile from './pages/master/MasterProfile'

function MasterRoute({ children }) {
  const user = store.getUser()
  if (user?.role !== 'master') return <Navigate to="/profile" />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Клиент */}
        <Route path="/" element={<Home />} />
        <Route path="/salon/:id" element={<SalonPage />} />
        <Route path="/master/:id" element={<MasterPage />} />
        <Route path="/booking/:masterId" element={<BookingPage />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/profile" element={<Profile />} />

        {/* Мастер */}
        <Route path="/master" element={<MasterRoute><MasterSchedule /></MasterRoute>} />
        <Route path="/master/profile" element={<MasterRoute><MasterProfile /></MasterRoute>} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
