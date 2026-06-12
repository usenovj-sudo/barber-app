import { useState } from 'react'
import { bookingStore, masterStore } from '../../../lib/beautyStore'
import { beautyMasterAuth } from '../../../lib/beautyAuth'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Check, X, Eye, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

const STATUS_CONFIG = {
  awaiting_confirmation: { label: 'Ожидает подтверждения', color: 'text-amber-600 bg-amber-50', icon: AlertCircle },
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

export default function BeautyDashboard() {
  const user = beautyMasterAuth.current()
  const masterId = user?.master_id
  const [bookings, setBookings] = useState(() => bookingStore.getForMaster(masterId))
  const [filter, setFilter] = useState('active')
  const [receiptModal, setReceiptModal] = useState(null)

  function reload() { setBookings(bookingStore.getForMaster(masterId)) }

  function confirm(id) { bookingStore.confirmBooking(id); reload() }
  function reject(id) { bookingStore.rejectBooking(id); reload() }

  const today = new Date().toISOString().split('T')[0]
  const pending = bookings.filter(b => b.status === 'awaiting_confirmation')
  const todayConfirmed = bookings.filter(b => b.date === today && b.status === 'confirmed')
  const revenue = todayConfirmed.reduce((sum, b) => sum + (b.service_price || 0), 0)

  const filtered = bookings.filter(b => {
    if (filter === 'active') return ['awaiting_confirmation', 'confirmed'].includes(b.status) && b.date >= today
    if (filter === 'pending') return b.status === 'awaiting_confirmation'
    if (filter === 'history') return b.date < today || ['rejected', 'cancelled'].includes(b.status)
    return true
  }).sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Мои записи</h1>
        <p className="text-sm text-gray-500 mt-0.5">Управление клиентами</p>
      </div>

      {/* Stats */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{todayConfirmed.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Сегодня</div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-100">
          <div className="text-2xl font-bold text-amber-600">{pending.length}</div>
          <div className="text-xs text-amber-600 mt-0.5">Ожидают</div>
        </div>
        <div className="bg-rose-50 rounded-2xl p-4 text-center border border-rose-100">
          <div className="text-2xl font-bold text-rose-600">
            {bookings.filter(b => b.status === 'confirmed').length}
          </div>
          <div className="text-xs text-rose-500 mt-0.5">Подтв.</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 mt-4 flex gap-2">
        {[
          { key: 'active', label: 'Активные' },
          { key: 'pending', label: `Ожидают ${pending.length > 0 ? `(${pending.length})` : ''}` },
          { key: 'history', label: 'История' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === tab.key ? 'bg-rose-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      <div className="px-4 mt-4 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Записей нет</p>
          </div>
        )}

        {filtered.map(booking => {
          const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.cancelled
          const Icon = cfg.icon
          const isPending = booking.status === 'awaiting_confirmation'

          return (
            <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{booking.client_name}</p>
                    <p className="text-sm text-gray-500">{booking.client_phone}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl ${cfg.color}`}>
                    <Icon size={12} />
                    {cfg.label}
                  </span>
                </div>

                <div className="flex gap-4 text-sm text-gray-600 mb-2">
                  <span>📅 {formatDate(booking.date)}</span>
                  <span>⏰ {booking.start_time} – {booking.end_time}</span>
                </div>

                <p className="text-sm font-semibold text-gray-800">{booking.service_name}</p>
                {booking.comment && (
                  <p className="text-xs text-gray-400 mt-1 italic">💬 {booking.comment}</p>
                )}

                {/* Deposit info */}
                <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-between
                  ${booking.deposit_status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                  <span>💰 Депозит: {booking.deposit_amount ? booking.deposit_amount.toLocaleString() + ' ₸' : 'не требуется'}</span>
                  {booking.deposit_status === 'paid' && <span>✓ Оплачен</span>}
                  {booking.deposit_status === 'pending' && booking.receipt_url && <span>Чек загружен</span>}
                </div>

                {/* Receipt button */}
                {booking.receipt_url && (
                  <button
                    onClick={() => setReceiptModal(booking.receipt_url)}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-gray-50 rounded-xl py-2.5 text-sm text-gray-600 font-medium border border-gray-100"
                  >
                    <Eye size={16} /> Посмотреть чек об оплате
                  </button>
                )}
                {isPending && !booking.receipt_url && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                    ⏳ Клиент ещё не загрузил чек
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {isPending && (
                <div className="border-t border-gray-100 grid grid-cols-2">
                  <button
                    onClick={() => reject(booking.id)}
                    className="flex items-center justify-center gap-2 py-3.5 text-red-500 font-semibold text-sm border-r border-gray-100"
                  >
                    <X size={16} /> Отклонить
                  </button>
                  <button
                    onClick={() => confirm(booking.id)}
                    className="flex items-center justify-center gap-2 py-3.5 text-green-600 font-bold text-sm"
                  >
                    <Check size={16} /> Подтвердить
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Receipt modal */}
      {receiptModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
             onClick={() => setReceiptModal(null)}>
          <div className="max-w-sm w-full bg-white rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="font-bold text-gray-900">Чек об оплате</p>
              <button onClick={() => setReceiptModal(null)} className="text-gray-400"><X size={20} /></button>
            </div>
            <img src={receiptModal} alt="receipt" className="w-full" />
          </div>
        </div>
      )}
    </div>
  )
}
