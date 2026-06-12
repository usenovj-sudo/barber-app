import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { beautyMasterAuth } from '../../../lib/beautyAuth'
import { Sparkles } from 'lucide-react'

export default function BeautyMasterLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await beautyMasterAuth.login(form)
    if (res.error) { setError(res.error); setLoading(false); return }
    navigate('/beauty/pro')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Вход для мастера</h1>
            <p className="text-gray-500 text-sm mt-1">Beauty Booking — Казахстан</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Номер телефона</label>
              <input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 777 000 00 00"
                type="tel"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Пароль</label>
              <input
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Введите пароль"
                type="password"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl p-3">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-60"
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Нет аккаунта?{' '}
            <Link to="/beauty/pro/register" className="text-rose-600 font-semibold">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
