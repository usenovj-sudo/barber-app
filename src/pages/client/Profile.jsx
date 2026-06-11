import { useNavigate } from 'react-router-dom'
import { clientAuth } from '../../lib/auth'
import PageHeader from '../../components/PageHeader'

export default function Profile() {
  const navigate = useNavigate()
  const user = clientAuth.current()

  function handleLogout() {
    clientAuth.logout()
    navigate('/login')
  }

  return (
    <div className="pb-24">
      <PageHeader title="Профиль" back={false} />
      <div className="px-4 py-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-[#1a1a2e] rounded-full flex items-center justify-center mb-3">
            <span className="text-white text-2xl font-bold">{user?.name?.[0] || '?'}</span>
          </div>
          <h2 className="font-bold text-xl text-gray-900">{user?.name}</h2>
          <p className="text-gray-500 text-sm">{user?.phone}</p>
        </div>

        <div className="space-y-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Имя</p>
            <p className="font-semibold text-gray-900">{user?.name}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Телефон (логин)</p>
            <p className="font-semibold text-gray-900">{user?.phone}</p>
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
