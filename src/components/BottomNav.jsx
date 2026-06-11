import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, User, Briefcase } from 'lucide-react'

export default function BottomNav() {
  const location = useLocation()
  const isMasterApp = location.pathname.startsWith('/pro')

  const navCls = (active) =>
    `flex-1 flex flex-col items-center py-3 text-xs gap-1 ${active ? 'text-[#1a1a2e]' : 'text-gray-400'}`

  if (isMasterApp) {
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
