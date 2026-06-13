import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingStore, masterStore } from '../../../lib/beautyStore'
import { beautyClientAuth } from '../../../lib/beautyClientAuth'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react'

const STATUS_CONFIG = {
  awaiting_confirmation: { label: 'Ожидает', color: 'text-amber-600 bg-amber-50', icon: AlertCircle },
  confirmed:             { label: 'Подтверждена', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  rejected:              { label: 'Отклонена', color: 'text-red-500 bg-red-50', icon: XCircle },
  cancelled:             { label: 'Отменена', color: 'text-gray-400 bg-gray-50', icon: XCircle },
}

function formatDate(dateStr) {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Сегодня'
  if (isTomorrow(d)) return 'Завтра'
  return format(d, 'd MMMM', { locale: ru })
}

export default function BeautyClientBookings() {
  const user = beautyClientAuth.current()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [masters, setMasters] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const bkgs = await bookingStore.getByPhone(user?.phone || '')
      if (!alive) return
      const sorted = bkgs.sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time))
      setBookings(sorted)

      const uniqueIds = [...new Set(bkgs.map(b => b.master_id))]
      const map = {}
      await Promise.all(uniqueIds.map(async id => {
        const m = await masterStore.getById(id)
        if (m) map[id] = m
      }))
      if (!alive) return
      setMasters(map)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [user?.phone])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
      <Clock size={32} className="animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Мои записи</h1>
        <p className="text-sm text-gray-500 mt-0.5">{bookings.length} {bookings.length === 1 ? 'запись' : 'записей'}</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {bookings.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Clock size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-gray-600">Записей пока нет</p>
            <p className="text-sm mt-1">Найдите мастера и запишитесь</p>
            <button onClick={() => navigate('/client')}
              className="mt-5 bg-rose-600 text-white rounded-2xl px-6 py-3 font-bold text-sm">
              Найти мастера
            </button>
          </div>
        )}

        {bookings.map(b => {
          const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.cancelled
          const Icon = cfg.icon
          const master = masters[b.master_id]
          return (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {master && (
                <button
                  onClick={() => navigate(`/b/${master.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-left active:bg-gray-50"
                >
                  <img src={master.photo} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">{master.name}</p>
                    {master.address && (
                      <p className="text-xs text-gray-400 truncate">📍 {master.address}</p>
                    )}
                  </div>
                  <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
                </button>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-gray-800 flex-1 pr-2">{b.service_name}</p>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-xl flex-shrink-0 ${cfg.color}`}>
                    <Icon size={11} /> {cfg.label}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500 mb-2">
                  <span>📅 {formatDate(b.date)}</span>
                  <span>⏰ {b.start_time} – {b.end_time}</span>
                </div>
                <p className="text-sm font-bold text-rose-600">{b.service_price?.toLocaleString()} ₸</p>

                {b.deposit_required && b.deposit_status === 'paid' && (
                  <p className="text-xs text-green-600 mt-1">✓ Бронь оплачена · {b.deposit_paid?.toLocaleString()} ₸</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
