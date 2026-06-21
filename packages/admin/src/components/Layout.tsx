import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/', label: 'Дашборд', end: true },
  { to: '/reports', label: 'Отчёты' },
  { to: '/inventory', label: 'Склад' },
  { to: '/menu', label: 'Меню' },
  { to: '/kitchen', label: '🍳 Экран кухни' },
  { to: '/audit', label: 'Аудит' },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-5 text-lg font-semibold text-white border-b border-slate-700/60">
          ☕ Cafe Platform
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-brand-600 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700/60 text-xs text-slate-400">
          {user?.name}
          <div className="text-slate-500">{user?.role}</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-end px-6">
          <button
            onClick={logout}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Выйти
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
