import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { masterAuth } from '../../lib/auth'
import { Briefcase } from 'lucide-react'

export default function MasterRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', password: '', specialization: '' })
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const res = masterAuth.register(form)
    if (res.error) return setError(res.error)
    navigate('/pro')
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-[#0f3460] py-10"
         style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-3">
          <Briefcase size={30} className="text-[#0f3460]" />
        </div>
        <h1 className="text-2xl font-bold text-white">Стать мастером</h1>
        <p className="text-blue-200 text-sm">Регистрация в BarberBook Про</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-blue-100 mb-1 block">Ваше имя</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            placeholder="Александр Петров"
            className="w-full rounded-xl px-4 py-3.5 text-base outline-none bg-white/95" />
        </div>
        <div>
          <label className="text-sm font-semibold text-blue-100 mb-1 block">Телефон (это ваш логин)</label>
          <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
            placeholder="+7 (999) 000-00-00" type="tel"
            className="w-full rounded-xl px-4 py-3.5 text-base outline-none bg-white/95" />
        </div>
        <div>
          <label className="text-sm font-semibold text-blue-100 mb-1 block">Специализация</label>
          <input value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})}
            placeholder="Стрижки, борода"
            className="w-full rounded-xl px-4 py-3.5 text-base outline-none bg-white/95" />
        </div>
        <div>
          <label className="text-sm font-semibold text-blue-100 mb-1 block">Пароль</label>
          <input value={form.password} onChange={e => setForm({...form, password: e.target.value})}
            placeholder="Минимум 4 символа" type="password"
            className="w-full rounded-xl px-4 py-3.5 text-base outline-none bg-white/95" />
        </div>

        {error && <p className="text-red-300 text-sm text-center">{error}</p>}

        <button type="submit"
          className="w-full bg-white text-[#0f3460] rounded-2xl py-4 font-bold text-base mt-2 active:scale-[0.98] transition-transform">
          Зарегистрироваться
        </button>
      </form>

      <p className="text-center text-sm text-blue-200 mt-6">
        Уже есть аккаунт?{' '}
        <Link to="/pro/login" className="text-white font-semibold underline">Войти</Link>
      </p>
    </div>
  )
}
