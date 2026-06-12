import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { beautyMasterAuth } from '../../../lib/beautyAuth'
import { BEAUTY_CATEGORIES } from '../../../lib/beautyData'
import { Sparkles } from 'lucide-react'

export default function BeautyMasterRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', phone: '', password: '',
    specialization: 'nails', city: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await beautyMasterAuth.register(form)
    if (res.error) { setError(res.error); setLoading(false); return }
    navigate('/beauty/pro')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col pb-10">
      <div className="flex flex-col items-center pt-12 pb-6 px-6">
        <div className="w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center mb-4">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Регистрация мастера</h1>
        <p className="text-gray-500 text-sm mt-1">Создайте профиль и начните принимать клиентов</p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 space-y-4 max-w-sm mx-auto w-full">
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Ваше имя *</label>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Айгерим Касымова"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Специализация *</label>
          <div className="grid grid-cols-3 gap-2">
            {BEAUTY_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setForm({ ...form, specialization: cat.id })}
                className={`rounded-2xl p-3 text-center border transition-all ${form.specialization === cat.id ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
              >
                <div className="text-xl">{cat.icon}</div>
                <div className="text-xs mt-0.5 font-medium leading-tight">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Город</label>
          <input
            value={form.city}
            onChange={e => setForm({ ...form, city: e.target.value })}
            placeholder="Алматы"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Номер телефона *</label>
          <input
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="+7 777 000 00 00"
            type="tel"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Пароль *</label>
          <input
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Минимум 4 символа"
            type="password"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl p-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-60"
        >
          {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Уже есть аккаунт?{' '}
        <Link to="/beauty/pro/login" className="text-rose-600 font-semibold">Войти</Link>
      </p>
    </div>
  )
}
