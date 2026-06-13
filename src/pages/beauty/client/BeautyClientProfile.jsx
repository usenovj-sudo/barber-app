import { useNavigate } from 'react-router-dom'
import { beautyClientAuth } from '../../../lib/beautyClientAuth'
import { User, Phone, LogOut } from 'lucide-react'

export default function BeautyClientProfile() {
  const user = beautyClientAuth.current()
  const navigate = useNavigate()

  function logout() {
    beautyClientAuth.logout()
    navigate('/client/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Профиль</h1>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <User size={28} className="text-rose-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">{user?.name}</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone size={13} /> +{user?.phone}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full border border-red-100 text-red-500 rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 bg-white"
        >
          <LogOut size={18} /> Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}
