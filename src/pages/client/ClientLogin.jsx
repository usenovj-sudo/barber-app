import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { clientAuth } from '../../lib/auth'
import { Scissors } from 'lucide-react'

export default function ClientLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const res = clientAuth.login(form)
    if (res.error) return setError(res.error)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6"
         style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-[#1a1a2e] rounded-2xl flex items-center justify-center mb-3">
          <Scissors size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">BarberBook</h1>
        <p className="text-gray-500 text-sm">Запись к парикмахеру</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Телефон</label>
          <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
            placeholder="+7 (999) 000-00-00" type="tel" autoComplete="username"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base outline-none focus:border-[#1a1a2e]" />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Пароль</label>
          <input value={form.password} onChange={e => setForm({...form, password: e.target.value})}
            placeholder="Введите пароль" type="password" autoComplete="current-password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base outline-none focus:border-[#1a1a2e]" />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button type="submit"
          className="w-full bg-[#1a1a2e] text-white rounded-2xl py-4 font-bold text-base mt-2 active:scale-[0.98] transition-transform">
          Войти
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-[#1a1a2e] font-semibold">Зарегистрироваться</Link>
      </p>

      <Link to="/pro/login" className="text-center text-xs text-gray-400 mt-8">
        Вы парикмахер? Перейти в кабинет мастера →
      </Link>
    </div>
  )
}
