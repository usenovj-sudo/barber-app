import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, User, Briefcase, ImageIcon, LayoutDashboard, Search } from 'lucide-react'

export default function BottomNav() {
  const location = useLocation()
  const path = location.pathname

  const isBeautyPro    = path.startsWith('/beauty/pro')
  const isBarberPro    = path.startsWith('/pro')
  const isBeautyClient = path.startsWith('/client') && !path.includes('/login') && !path.includes('/register')

  const navCls = (active, accent = false) =>
    `flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
      active ? (accent ? 'text-rose-600' : 'text-[#1a1a2e]') : 'text-gray-400'
    }`

  // Beauty client navigation
  if (isBeautyClient) {
    return (
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex z-50"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NavLink to="/client" end className={({ isActive }) => navCls(isActive, true)}>
          <Search size={22} /><span>Поиск</span>
        </NavLink>
        <NavLink to="/client/bookings" className={({ isActive }) => navCls(isActive, true)}>
          <Calendar size={22} /><span>Записи</span>
        </NavLink>
        <NavLink to="/client/profile" className={({ isActive }) => navCls(isActive, true)}>
          <User size={22} /><span>Профиль</span>
        </NavLink>
      </nav>
    )
  }

  // Beauty master navigation
  if (isBeautyPro) {
    return (
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex z-50"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NavLink to="/beauty/pro" end className={({ isActive }) => navCls(isActive, true)}>
          <LayoutDashboard size={22} /><span>Записи</span>
        </NavLink>
        <NavLink to="/beauty/pro/portfolio" className={({ isActive }) => navCls(isActive, true)}>
          <ImageIcon size={22} /><span>Портфолио</span>
        </NavLink>
        <NavLink to="/beauty/pro/profile" className={({ isActive }) => navCls(isActive, true)}>
          <Briefcase size={22} /><span>Профиль</span>
        </NavLink>
      </nav>
    )
  }

  // Barber master navigation
  if (isBarberPro) {
    return (
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex z-50"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NavLink to="/pro" end className={({ isActive }) => navCls(isActive)}>
          <Calendar size={22} /><span>Расписание</span>
        </NavLink>
        <NavLink to="/pro/profile" className={({ isActive }) => navCls(isActive)}>
          <Briefcase size={22} /><span>Профиль</span>
        </NavLink>
      </nav>
    )
  }

  // Barber client navigation
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <NavLink to="/" end className={({ isActive }) => navCls(isActive)}>
        <Home size={22} /><span>Главная</span>
      </NavLink>
      <NavLink to="/bookings" className={({ isActive }) => navCls(isActive)}>
        <Calendar size={22} /><span>Мои записи</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => navCls(isActive)}>
        <User size={22} /><span>Профиль</span>
      </NavLink>
    </nav>
  )
}
