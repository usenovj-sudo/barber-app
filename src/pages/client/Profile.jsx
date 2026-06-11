import { useState } from 'react'
import { store } from '../../lib/store'
import PageHeader from '../../components/PageHeader'
import { User, LogIn } from 'lucide-react'

export default function Profile() {
  const [user, setUser] = useState(store.getUser())
  const [form, setForm] = useState({ name: '', phone: '' })
  const [mode, setMode] = useState('view') // view | login

  function handleLogin(e) {
    e.preventDefault()
    if (!form.name || !form.phone) return alert('Заполни все поля')
    const u = { name: form.name, phone: form.phone, role: 'client' }
    store.saveUser(u)
    setUser(u)
    setMode('view')
  }

  function handleLogout() {
    store.clearUser()
    setUser(null)
  }

  if (!user) {
    return (
      <div className="pb-24">
        <PageHeader title="Профиль" back={false} />
        <div className="px-4 py-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <User size={36} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">Войдите, чтобы управлять записями</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Ваше имя</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Иван Иванов"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Телефон</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="+7 (999) 000-00-00" type="tel"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e]" />
            </div>
            <button type="submit"
              className="w-full bg-[#1a1a2e] text-white rounded-2xl py-4 font-bold mt-2 flex items-center justify-center gap-2">
              <LogIn size={18} /> Войти
            </button>
          </form>

          {/* Вход как мастер */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-400 mb-3">Вы мастер?</p>
            <button onClick={() => {
              const u = { name: 'Александр Петров', phone: '+79991234567', role: 'master', master_id: 'm1' }
              store.saveUser(u); setUser(u)
            }} className="w-full border border-gray-200 rounded-2xl py-3 text-sm text-gray-600">
              Войти как мастер (демо)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <PageHeader title="Профиль" back={false} />
      <div className="px-4 py-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-[#1a1a2e] rounded-full flex items-center justify-center mb-3">
            <span className="text-white text-2xl font-bold">{user.name[0]}</span>
          </div>
          <h2 className="font-bold text-xl text-gray-900">{user.name}</h2>
          <p className="text-gray-500 text-sm">{user.phone}</p>
          {user.role === 'master' && (
            <span className="mt-2 bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-semibold">Мастер</span>
          )}
        </div>

        <div className="space-y-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Имя</p>
            <p className="font-semibold text-gray-900">{user.name}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Телефон</p>
            <p className="font-semibold text-gray-900">{user.phone}</p>
          </div>
        </div>

        <button onClick={handleLogout}
          className="w-full mt-6 border border-red-100 text-red-500 rounded-2xl py-4 font-semibold">
          Выйти
        </button>
      </div>
    </div>
  )
}
