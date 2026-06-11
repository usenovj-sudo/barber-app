import { NavLink } from 'react-router-dom'
import { Home, Calendar, User } from 'lucide-react'
import { store } from '../lib/store'

export default function BottomNav() {
  const user = store.getUser()
  const isMaster = user?.role === 'master'

  if (isMaster) {
    return (
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex z-50"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NavLink to="/master" end className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs gap-1 ${isActive ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>
          <Calendar size={22} />
          <span>Расписание</span>
        </NavLink>
        <NavLink to="/master/profile" className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs gap-1 ${isActive ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>
          <User size={22} />
          <span>Профиль</span>
        </NavLink>
      </nav>
    )
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <NavLink to="/" end className={({ isActive }) =>
        `flex-1 flex flex-col items-center py-3 text-xs gap-1 ${isActive ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>
        <Home size={22} />
        <span>Главная</span>
      </NavLink>
      <NavLink to="/bookings" className={({ isActive }) =>
        `flex-1 flex flex-col items-center py-3 text-xs gap-1 ${isActive ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>
        <Calendar size={22} />
        <span>Мои записи</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) =>
        `flex-1 flex flex-col items-center py-3 text-xs gap-1 ${isActive ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>
        <User size={22} />
        <span>Профиль</span>
      </NavLink>
    </nav>
  )
}
