import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { store } from '../../lib/store'
import { getMasterById, getServicesForMaster, clientAuth } from '../../lib/auth'
import { formatDate } from '../../lib/timeSlots'
import PageHeader from '../../components/PageHeader'
import { Calendar, X, ChevronRight } from 'lucide-react'

const STATUS_LABELS = {
  confirmed: { label: 'Подтверждена', color: 'bg-green-100 text-green-700' },
  pending:   { label: 'Ожидает',      color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Выполнена',    color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Отменена',     color: 'bg-gray-100 text-gray-500' },
}

export default function MyBookings() {
  const navigate = useNavigate()
  const [refresh, setRefresh] = useState(0)
  const user = clientAuth.current()

  const allBookings = store.getBookings()
    .filter(b => !user || b.client_phone === user.phone)
    .sort((a, b) => (a.date + a.start_time) > (b.date + b.start_time) ? -1 : 1)

  const upcoming = allBookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed' && (b.date + b.start_time) >= new Date().toISOString().slice(0,16).replace('T',''))
  const past = allBookings.filter(b => b.status === 'completed' || b.status === 'cancelled' || (b.date + b.start_time) < new Date().toISOString().slice(0,16).replace('T',''))

  function cancel(id) {
    if (confirm('Отменить запись?')) {
      store.cancelBooking(id)
      setRefresh(r => r + 1)
    }
  }

  function BookingCard({ b }) {
    const master = getMasterById(b.master_id)
    const service = getServicesForMaster(b.master_id).find(s => s.id === b.service_id)
    const st = STATUS_LABELS[b.status] || STATUS_LABELS.pending
    const isPast = b.status === 'cancelled' || b.status === 'completed'
    const now = new Date().toISOString().slice(0,16).replace('T','')
    const canCancel = !isPast && (b.date + b.start_time) > now

    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            {master && <img src={master.photo} className="w-10 h-10 rounded-xl object-cover" />}
            <div>
              <p className="font-bold text-gray-900 text-sm">{master?.name || 'Мастер'}</p>
              <p className="text-xs text-gray-500">{service?.name}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
          <span>📅 {formatDate(b.date)}</span>
          <span>🕐 {b.start_time} – {b.end_time}</span>
        </div>

        {b.price && (
          <p className="text-sm mt-2 font-semibold text-[#1a1a2e]">{b.price} ₸</p>
        )}

        {b.comment && (
          <p className="text-xs text-gray-400 mt-1 italic">"{b.comment}"</p>
        )}

        {canCancel && (
          <button onClick={() => cancel(b.id)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-red-500 text-sm border border-red-100 rounded-xl py-2 active:bg-red-50">
            <X size={15} /> Отменить запись
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="pb-24">
      <PageHeader title="Мои записи" back={false} />

      {allBookings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <Calendar size={48} className="text-gray-300 mb-3" />
          <p className="text-gray-500 text-center">У вас пока нет записей</p>
          <button onClick={() => navigate('/')}
            className="mt-4 bg-[#1a1a2e] text-white px-6 py-3 rounded-2xl font-semibold">
            Записаться
          </button>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="font-bold text-gray-900 mb-3">Предстоящие</h2>
          <div className="space-y-3">
            {upcoming.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="font-bold text-gray-900 mb-3">История</h2>
          <div className="space-y-3">
            {past.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        </div>
      )}
    </div>
  )
}
