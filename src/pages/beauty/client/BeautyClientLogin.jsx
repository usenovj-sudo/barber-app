import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { beautyClientAuth } from '../../../lib/beautyClientAuth'
import { Sparkles } from 'lucide-react'

export default function BeautyClientLogin() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await beautyClientAuth.login({ phone, password })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    navigate('/client', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Вход для клиента</h1>
          <p className="text-gray-500 text-sm mt-1">Beauty — запись онлайн</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Номер телефона</label>
            <input
              value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+7 777 000 00 00" type="tel"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400 bg-white"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Пароль</label>
            <input
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Введите пароль" type="password"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400 bg-white"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2 px-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-50">
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Нет аккаунта?{' '}
          <Link to="/client/register" className="text-rose-600 font-semibold">Зарегистрироваться</Link>
        </p>
        <div className="mt-6 pt-5 border-t border-gray-200 text-center">
          <Link to="/beauty/pro/login" className="text-xs text-gray-400 underline">
            Я мастер — войти в кабинет
          </Link>
        </div>
      </div>
    </div>
  )
}
