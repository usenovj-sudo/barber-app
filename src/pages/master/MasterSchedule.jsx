import { useState } from 'react'
import { store } from '../../lib/store'
import { masterAuth, getMasterById, getServicesForMaster } from '../../lib/auth'
import { generateSlots, getSlotStatus, formatDate, getNext14Days, isoDate, addMinutes } from '../../lib/timeSlots'
import { Lock, Unlock, Phone, ChevronDown, ChevronUp } from 'lucide-react'

const DAYS_RU = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
const MONTHS_RU = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']

const STATUS_LABELS = {
  confirmed: { label: 'Подтверждена', color: 'bg-green-100 text-green-700' },
  pending:   { label: 'Ожидает',      color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Выполнена',    color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Отменена',     color: 'bg-gray-100 text-gray-500' },
}

export default function MasterSchedule() {
  const user = masterAuth.current()
  const masterId = user?.master_id || 'm1'
  const master = getMasterById(masterId)
  const myServices = getServicesForMaster(masterId)

  const days = getNext14Days()
  const slots = generateSlots()
  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()))
  const [refresh, setRefresh] = useState(0)
  const [blockModal, setBlockModal] = useState(null) // slot.time | 'day'
  const [blockReason, setBlockReason] = useState('')
  const [expandedBooking, setExpandedBooking] = useState(null)

  const bookings = store.getBookings()
  const blocks = store.getBlocks()

  function getStatus(slot) {
    return getSlotStatus(slot, selectedDate, masterId, bookings, blocks)
  }

  function handleBlock() {
    if (!blockReason.trim()) return alert('Укажи причину')
    if (blockModal === 'day') {
      // Блокируем весь день
      store.addBlock({ master_id: masterId, date: selectedDate, start_time: '09:00', end_time: '19:00', reason: blockReason })
    } else {
      const endTime = addMinutes(blockModal, 30)
      store.addBlock({ master_id: masterId, date: selectedDate, start_time: blockModal, end_time: endTime, reason: blockReason })
    }
    setBlockModal(null)
    setBlockReason('')
    setRefresh(r => r + 1)
  }

  function handleUnblock(slot) {
    const block = blocks.find(b =>
      b.master_id === masterId && b.date === selectedDate &&
      b.start_time <= slot.time && b.end_time > slot.time
    )
    if (block) { store.removeBlock(block.id); setRefresh(r => r + 1) }
  }

  function updateStatus(id, status) {
    store.updateBookingStatus(id, status)
    setRefresh(r => r + 1)
  }

  const todayBookings = bookings.filter(
    b => b.master_id === masterId && b.date === selectedDate && b.status !== 'cancelled'
  ).sort((a, b) => a.start_time > b.start_time ? 1 : -1)

  const fmtDay = (d) => {
    const dt = new Date(d + 'T00:00:00')
    return { day: dt.getDate(), month: MONTHS_RU[dt.getMonth()], weekday: DAYS_RU[dt.getDay()] }
  }

  const isDayBlocked = blocks.some(
    b => b.master_id === masterId && b.date === selectedDate && b.start_time === '09:00' && b.end_time === '19:00'
  )

  return (
    <div className="pb-24">
      {/* Шапка */}
      <div className="bg-[#1a1a2e] text-white px-4 pb-4"
           style={{ paddingTop: `calc(env(safe-area-inset-top) + 16px)` }}>
        <p className="text-gray-400 text-sm">Кабинет мастера</p>
        <h1 className="text-xl font-bold">{master?.name}</h1>
      </div>

      {/* Выбор даты */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-gray-100">
        {days.map(d => {
          const { day, month, weekday } = fmtDay(d)
          const isToday = d === isoDate(new Date())
          return (
            <button key={d} onClick={() => setSelectedDate(d)}
              className={`shrink-0 flex flex-col items-center rounded-xl px-3 py-2 border-2 min-w-[52px] transition-all
                ${selectedDate === d ? 'bg-[#1a1a2e] border-[#1a1a2e] text-white' : 'bg-white border-gray-100 text-gray-700'}`}>
              <span className="text-xs opacity-70">{weekday}</span>
              <span className="font-bold text-base leading-none">{day}</span>
              <span className="text-xs opacity-70">{month}</span>
              {isToday && <span className="text-[9px] mt-0.5 opacity-70">сегодня</span>}
            </button>
          )
        })}
      </div>

      {/* Действия с днём */}
      <div className="px-4 py-3 flex gap-2">
        <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-xs text-gray-500">{formatDate(selectedDate)}</p>
          <p className="font-semibold text-sm text-gray-900">
            {todayBookings.length} записей · {todayBookings.reduce((a,b) => {
              const s = myServices.find(s => s.id === b.service_id)
              return a + (s?.price || 0)
            }, 0)} ₽
          </p>
        </div>
        {isDayBlocked ? (
          <button onClick={() => { store.removeBlock(blocks.find(b => b.master_id === masterId && b.date === selectedDate && b.start_time === '09:00')?.id); setRefresh(r=>r+1) }}
            className="flex items-center gap-1 text-xs bg-green-100 text-green-700 rounded-xl px-3 py-2 font-semibold">
            <Unlock size={14} /> Открыть день
          </button>
        ) : (
          <button onClick={() => setBlockModal('day')}
            className="flex items-center gap-1 text-xs bg-red-50 text-red-600 rounded-xl px-3 py-2 font-semibold">
            <Lock size={14} /> Закрыть день
          </button>
        )}
      </div>

      {/* Сетка слотов */}
      <div className="px-4 mb-4">
        <h2 className="font-bold text-gray-900 mb-2 text-sm">Расписание</h2>
        <div className="grid grid-cols-4 gap-2">
          {slots.map(slot => {
            const status = getStatus(slot)
            const booking = bookings.find(
              b => b.master_id === masterId && b.date === selectedDate &&
                   b.status !== 'cancelled' && b.start_time <= slot.time && b.end_time > slot.time
            )
            let cls = 'slot-free'
            if (status === 'lunch') cls = 'slot-lunch'
            else if (status === 'blocked' || status === 'past') cls = 'slot-blocked'
            else if (status === 'busy') cls = 'slot-busy'

            return (
              <div key={slot.time} className={`${cls} rounded-xl py-2 text-xs font-semibold text-center relative`}>
                <div>{slot.time}</div>
                {status === 'busy' && booking && (
                  <div className="text-[10px] truncate px-1 opacity-80">{booking.client_name.split(' ')[0]}</div>
                )}
                {status === 'free' && !isDayBlocked && (
                  <button onClick={() => setBlockModal(slot.time)}
                    className="absolute top-0.5 right-0.5 text-gray-400 hover:text-gray-600">
                    <Lock size={10} />
                  </button>
                )}
                {status === 'blocked' && (
                  <button onClick={() => handleUnblock(slot)}
                    className="absolute top-0.5 right-0.5 text-gray-400">
                    <Unlock size={10} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Список записей */}
      <div className="px-4">
        <h2 className="font-bold text-gray-900 mb-3">Записи на {formatDate(selectedDate)}</h2>
        {todayBookings.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">Записей нет</p>
        )}
        <div className="space-y-3">
          {todayBookings.map(b => {
            const service = myServices.find(s => s.id === b.service_id)
            const st = STATUS_LABELS[b.status] || STATUS_LABELS.pending
            const isExpanded = expandedBooking === b.id
            return (
              <div key={b.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3"
                     onClick={() => setExpandedBooking(isExpanded ? null : b.id)}>
                  <div className="bg-[#1a1a2e] text-white rounded-xl px-3 py-2 text-center shrink-0">
                    <p className="font-bold text-sm">{b.start_time}</p>
                    <p className="text-[10px] opacity-70">{b.end_time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{b.client_name}</p>
                    <p className="text-xs text-gray-500">{service?.name} · {service?.price} ₽</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${st.color}`}>{st.label}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    <a href={`tel:${b.client_phone}`}
                      className="flex items-center gap-2 text-blue-600 text-sm">
                      <Phone size={15} /> {b.client_phone}
                    </a>
                    {b.comment && <p className="text-sm text-gray-500 italic">"{b.comment}"</p>}
                    <div className="flex gap-2">
                      {b.status !== 'completed' && b.status !== 'cancelled' && (
                        <button onClick={() => updateStatus(b.id, 'completed')}
                          className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold">
                          ✓ Выполнено
                        </button>
                      )}
                      {b.status !== 'cancelled' && (
                        <button onClick={() => updateStatus(b.id, 'cancelled')}
                          className="flex-1 border border-red-100 text-red-500 rounded-xl py-2.5 text-sm font-semibold">
                          Отменить
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Модал блокировки */}
      {blockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end"
             onClick={() => setBlockModal(null)}>
          <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-3xl p-6"
               onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 mb-1">
              {blockModal === 'day' ? '🔒 Закрыть весь день' : `🔒 Заблокировать ${blockModal}`}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {blockModal === 'day' ? formatDate(selectedDate) : `${selectedDate} · ${blockModal}`}
            </p>
            <textarea
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Причина (личные дела, собрание, отпуск...)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e] resize-none mb-4"
            />
            <button onClick={handleBlock}
              className="w-full bg-[#1a1a2e] text-white rounded-2xl py-4 font-bold">
              Заблокировать
            </button>
            <button onClick={() => setBlockModal(null)}
              className="w-full text-gray-400 py-3 text-sm">Отмена</button>
          </div>
        </div>
      )}
    </div>
  )
}
