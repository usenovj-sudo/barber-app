import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MOCK_MASTERS, MOCK_SERVICES } from '../../lib/mockData'
import { store } from '../../lib/store'
import { generateSlots, getSlotStatus, addMinutes, formatDate, getNext14Days } from '../../lib/timeSlots'
import PageHeader from '../../components/PageHeader'
import { CheckCircle2 } from 'lucide-react'

const DAYS_RU = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
const MONTHS_RU = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']

export default function BookingPage() {
  const { masterId } = useParams()
  const navigate = useNavigate()
  const master = MOCK_MASTERS.find(m => m.id === masterId)
  const services = MOCK_SERVICES.filter(s => s.master_id === masterId && s.active)

  const user = store.getUser()
  const days = getNext14Days()
  const slots = generateSlots()

  const [step, setStep] = useState(1) // 1=выбор услуги, 2=выбор даты/времени, 3=подтверждение, 4=готово
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(days[0])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', comment: '' })

  if (!master) return <div className="p-4">Не найдено</div>

  const bookings = store.getBookings()
  const blocks = store.getBlocks()

  const service = services.find(s => s.id === selectedService)

  function getStatus(slot) {
    return getSlotStatus(slot, selectedDate, masterId, bookings, blocks)
  }

  function canBook(slot) {
    if (getStatus(slot) !== 'free') return false
    if (!service) return false
    if (service.duration > 30) {
      const nextTime = addMinutes(slot.time, 30)
      const nextSlot = slots.find(s => s.time === nextTime)
      if (!nextSlot || getStatus(nextSlot) !== 'free') return false
    }
    return true
  }

  function handleConfirm() {
    if (!form.name || !form.phone) return alert('Заполни имя и телефон')
    const endTime = addMinutes(selectedSlot, service.duration)
    store.addBooking({
      master_id: masterId,
      client_name: form.name,
      client_phone: form.phone,
      date: selectedDate,
      start_time: selectedSlot,
      end_time: endTime,
      service_id: service.id,
      status: 'confirmed',
      comment: form.comment,
      price: service.price,
    })
    setStep(4)
  }

  const fmtDay = (d) => {
    const dt = new Date(d + 'T00:00:00')
    return { day: dt.getDate(), month: MONTHS_RU[dt.getMonth()], weekday: DAYS_RU[dt.getDay()] }
  }

  if (step === 4) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 pb-24">
        <div className="text-green-500 mb-4"><CheckCircle2 size={72} /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Запись оформлена!</h2>
        <div className="bg-gray-50 rounded-2xl p-4 w-full mb-6 space-y-2">
          <p className="text-sm"><span className="text-gray-500">Мастер:</span> <span className="font-semibold">{master.name}</span></p>
          <p className="text-sm"><span className="text-gray-500">Дата:</span> <span className="font-semibold">{formatDate(selectedDate)}</span></p>
          <p className="text-sm"><span className="text-gray-500">Время:</span> <span className="font-semibold">{selectedSlot} – {addMinutes(selectedSlot, service.duration)}</span></p>
          <p className="text-sm"><span className="text-gray-500">Услуга:</span> <span className="font-semibold">{service.name}</span></p>
          <p className="text-sm"><span className="text-gray-500">Стоимость:</span> <span className="font-bold text-[#1a1a2e]">{service.price} ₽</span></p>
        </div>
        <button onClick={() => navigate('/bookings')}
          className="w-full bg-[#1a1a2e] text-white rounded-2xl py-4 font-bold">
          Мои записи
        </button>
        <button onClick={() => navigate('/')}
          className="w-full mt-3 text-gray-500 py-3">
          На главную
        </button>
      </div>
    )
  }

  return (
    <div className="pb-32">
      <PageHeader title="Запись к мастеру" />

      {/* Шаги */}
      <div className="flex px-4 py-3 gap-2">
        {['Услуга','Дата и время','Подтверждение'].map((label, i) => (
          <div key={i} className="flex-1">
            <div className={`h-1 rounded-full ${step > i ? 'bg-[#1a1a2e]' : 'bg-gray-200'}`} />
            <p className={`text-xs mt-1 text-center ${step === i+1 ? 'text-[#1a1a2e] font-semibold' : 'text-gray-400'}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Шаг 1: Услуга */}
      {step === 1 && (
        <div className="px-4 py-2">
          <h2 className="font-bold text-gray-900 mb-3">Выберите услугу</h2>
          <div className="space-y-2">
            {services.map(s => (
              <div key={s.id}
                   onClick={() => setSelectedService(s.id)}
                   className={`flex justify-between items-center rounded-2xl px-4 py-4 border-2 cursor-pointer transition-all active:scale-[0.98]
                     ${selectedService === s.id ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-100 bg-white'}`}>
                <div>
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    {s.category === 'child' ? '👶 детская' : '👤 взрослая'} · {s.duration} мин
                  </p>
                </div>
                <span className="font-bold text-[#1a1a2e] text-lg">{s.price} ₽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Шаг 2: Дата и время */}
      {step === 2 && (
        <div className="px-4 py-2">
          {/* Выбор даты */}
          <h2 className="font-bold text-gray-900 mb-3">Выберите дату</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {days.map(d => {
              const { day, month, weekday } = fmtDay(d)
              return (
                <button key={d}
                  onClick={() => { setSelectedDate(d); setSelectedSlot(null) }}
                  className={`shrink-0 flex flex-col items-center rounded-xl px-3 py-2 border-2 min-w-[56px] transition-all
                    ${selectedDate === d ? 'bg-[#1a1a2e] border-[#1a1a2e] text-white' : 'bg-white border-gray-100 text-gray-700'}`}>
                  <span className="text-xs opacity-70">{weekday}</span>
                  <span className="font-bold text-lg leading-none">{day}</span>
                  <span className="text-xs opacity-70">{month}</span>
                </button>
              )
            })}
          </div>

          {/* Слоты времени */}
          <h2 className="font-bold text-gray-900 mt-4 mb-3">Выберите время</h2>

          {/* Легенда */}
          <div className="flex gap-3 flex-wrap text-xs mb-3">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block"/> Свободно</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"/> Занято</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-dashed border-yellow-400 inline-block"/> Обед</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-dashed border-gray-300 inline-block"/> Заблокировано</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {slots.map(slot => {
              const status = getStatus(slot)
              const bookable = canBook(slot)
              const isSelected = selectedSlot === slot.time
              let cls = 'slot-free'
              if (isSelected) cls = 'slot-selected'
              else if (status === 'lunch') cls = 'slot-lunch'
              else if (status === 'blocked' || status === 'past') cls = 'slot-blocked'
              else if (status === 'busy') cls = 'slot-busy'
              else if (!bookable) cls = 'slot-blocked'

              return (
                <button key={slot.time}
                  disabled={!bookable && !isSelected}
                  onClick={() => bookable || isSelected ? setSelectedSlot(isSelected ? null : slot.time) : null}
                  className={`${cls} rounded-xl py-2.5 text-sm font-semibold text-center transition-all active:scale-95`}>
                  {slot.time}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Шаг 3: Подтверждение */}
      {step === 3 && (
        <div className="px-4 py-2">
          <h2 className="font-bold text-gray-900 mb-4">Подтверждение записи</h2>

          {/* Сводка */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Мастер</span>
              <span className="text-sm font-semibold">{master.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Услуга</span>
              <span className="text-sm font-semibold">{service?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Дата</span>
              <span className="text-sm font-semibold">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Время</span>
              <span className="text-sm font-semibold">{selectedSlot} – {service && addMinutes(selectedSlot, service.duration)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-sm font-bold">Итого</span>
              <span className="font-bold text-[#1a1a2e] text-lg">{service?.price} ₽</span>
            </div>
          </div>

          {/* Форма */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Ваше имя *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Введите имя"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Телефон *</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="+7 (999) 000-00-00" type="tel"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Комментарий</label>
              <textarea value={form.comment} onChange={e => setForm({...form, comment: e.target.value})}
                placeholder="Пожелания к мастеру (необязательно)"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e] resize-none" />
            </div>
          </div>
        </div>
      )}

      {/* Кнопки навигации */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 p-4 space-y-2"
           style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 16px)` }}>
        {step < 3 ? (
          <button
            disabled={step === 1 ? !selectedService : !selectedSlot}
            onClick={() => setStep(step + 1)}
            className="w-full bg-[#1a1a2e] disabled:bg-gray-300 text-white rounded-2xl py-4 font-bold text-base transition-all active:scale-[0.98]">
            Далее →
          </button>
        ) : (
          <button onClick={handleConfirm}
            className="w-full bg-green-600 text-white rounded-2xl py-4 font-bold text-base active:scale-[0.98]">
            ✓ Подтвердить запись
          </button>
        )}
        {step > 1 && (
          <button onClick={() => setStep(step - 1)}
            className="w-full text-gray-500 py-2 text-sm">
            ← Назад
          </button>
        )}
      </div>
    </div>
  )
}
