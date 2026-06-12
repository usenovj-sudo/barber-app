import { useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { masterStore, serviceStore, bookingStore, blockStore } from '../../../lib/beautyStore'
import { BEAUTY_CATEGORIES } from '../../../lib/beautyData'
import { format, addDays, parseISO, isBefore, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, Upload, Check, ImageIcon, X } from 'lucide-react'

function buildSlots(start, end, duration, existingBookings, blocks, date) {
  const slots = []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let cur = sh * 60 + sm
  const endMin = eh * 60 + em

  const bookedRanges = [
    ...existingBookings.filter(b => b.date === date && !['cancelled','rejected'].includes(b.status)).map(b => {
      const [bh, bm] = b.start_time.split(':').map(Number)
      const [eh2, em2] = b.end_time.split(':').map(Number)
      return { start: bh * 60 + bm, end: eh2 * 60 + em2 }
    }),
    ...blocks.filter(b => b.date === date).map(b => {
      const [bh, bm] = b.start_time.split(':').map(Number)
      const [eh2, em2] = b.end_time.split(':').map(Number)
      return { start: bh * 60 + bm, end: eh2 * 60 + em2 }
    }),
  ]

  while (cur + duration <= endMin) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0')
    const m = String(cur % 60).padStart(2, '0')
    const slotEnd = cur + duration
    const busy = bookedRanges.some(r => cur < r.end && slotEnd > r.start)
    slots.push({ time: `${h}:${m}`, busy })
    cur += 30
  }
  return slots
}

function formatEndTime(start, durationMin) {
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + durationMin
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const DAYS_AHEAD = 30

export default function BeautyBooking() {
  const { masterId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const preselectedServiceId = location.state?.serviceId

  const master = masterStore.getById(masterId)
  const services = serviceStore.getForMaster(masterId).filter(s => s.active)
  const existingBookings = bookingStore.getForMaster(masterId)
  const blocks = blockStore.getForMaster(masterId)

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(
    preselectedServiceId ? services.find(s => s.id === preselectedServiceId) || null : null
  )
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [comment, setComment] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [done, setDone] = useState(false)
  const [booking, setBooking] = useState(null)
  const receiptRef = useRef()

  const today = startOfDay(new Date())
  const availableDates = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i + 1))
    .filter(d => {
      const dow = d.getDay()
      return (master?.work_days || [1,2,3,4,5,6]).includes(dow === 0 ? 7 : dow)
    })

  const slots = selectedDate && selectedService
    ? buildSlots(master.work_start, master.work_end, selectedService.duration, existingBookings, blocks, format(selectedDate, 'yyyy-MM-dd'))
    : []

  function handleReceiptFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setReceipt(ev.target.result)
    reader.readAsDataURL(file)
  }

  function canProceedStep1() { return !!selectedService }
  function canProceedStep2() { return selectedDate && selectedTime }
  function canProceedStep3() {
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 10) return false
    if (master?.deposit_required && !receipt) return false
    return true
  }

  function submitBooking() {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const endTime = formatEndTime(selectedTime, selectedService.duration)
    const newBooking = bookingStore.add({
      master_id: masterId,
      client_name: form.name.trim(),
      client_phone: form.phone.replace(/\D/g, ''),
      date: dateStr,
      start_time: selectedTime,
      end_time: endTime,
      service_id: selectedService.id,
      service_name: selectedService.name,
      service_price: selectedService.price,
      deposit_amount: master?.deposit_required ? master.deposit_amount : 0,
      deposit_status: receipt ? 'pending' : 'not_required',
      receipt_url: receipt || null,
      status: receipt || !master?.deposit_required ? 'awaiting_confirmation' : 'awaiting_payment',
      comment,
    })
    setBooking(newBooking)
    setDone(true)
  }

  if (!master) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">Мастер не найден</div>
  )

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <Check size={36} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Заявка отправлена!</h2>
        <p className="text-gray-500 mb-6 leading-relaxed">
          {master.name} получит вашу заявку и подтвердит запись.
          {master.deposit_required && receipt && ' Чек об оплате депозита отправлен.'}
        </p>

        <div className="w-full bg-white rounded-2xl p-5 border border-gray-100 text-left space-y-3 mb-8">
          <p className="font-bold text-gray-900 text-center mb-3">Детали записи</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Услуга</span>
            <span className="font-semibold text-right ml-4">{selectedService?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Дата</span>
            <span className="font-semibold">{format(selectedDate, 'd MMMM yyyy', { locale: ru })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Время</span>
            <span className="font-semibold">{selectedTime} – {formatEndTime(selectedTime, selectedService?.duration)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Стоимость</span>
            <span className="font-bold text-rose-600">{selectedService?.price.toLocaleString()} ₸</span>
          </div>
          {master.deposit_required && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Депозит</span>
              <span className="font-semibold text-amber-600">{master.deposit_amount.toLocaleString()} ₸ {receipt ? '✓' : ''}</span>
            </div>
          )}
        </div>

        {master.telegram && (
          <a href={`https://t.me/${master.telegram}`} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-sky-500 text-white rounded-2xl py-4 font-bold mb-3">
            Написать мастеру в Telegram
          </a>
        )}
        <button onClick={() => navigate(`/b/${masterId}`)}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-2xl py-4 font-semibold">
          Вернуться к профилю
        </button>
      </div>
    )
  }

  const cat = BEAUTY_CATEGORIES.find(c => c.id === master.specialization)

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate(`/b/${masterId}`)}
            className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Запись к мастеру</h1>
            <p className="text-xs text-gray-500">{master.name} · {cat?.icon} {cat?.label}</p>
          </div>
          <img src={master.photo} className="w-10 h-10 rounded-xl object-cover" alt="" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {[1,2,3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-rose-500' : 'bg-gray-100'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Шаг {step} из 3 · {['Услуга', 'Дата и время', 'Контакты'][step-1]}</p>
      </div>

      <div className="px-4 pt-4">

        {/* Step 1: Service */}
        {step === 1 && (
          <div className="space-y-2">
            <h2 className="font-bold text-gray-900 mb-3">Выберите услугу</h2>
            {services.map(s => {
              const c = BEAUTY_CATEGORIES.find(c => c.id === s.category)
              const hrs = Math.floor(s.duration / 60)
              const mins = s.duration % 60
              const durStr = hrs > 0 ? `${hrs} ч${mins > 0 ? ` ${mins} мин` : ''}` : `${mins} мин`
              const isSelected = selectedService?.id === s.id
              return (
                <button key={s.id} onClick={() => setSelectedService(s)}
                  className={`w-full rounded-2xl p-4 border text-left flex items-center gap-3 transition-all ${isSelected ? 'bg-rose-50 border-rose-300' : 'bg-white border-gray-100'}`}>
                  <div className="text-2xl">{c?.icon || '✨'}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{durStr}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${isSelected ? 'text-rose-600' : 'text-gray-800'}`}>{s.price.toLocaleString()} ₸</span>
                    {isSelected && <Check size={18} className="text-rose-500" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3">Выберите дату</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {availableDates.slice(0, 14).map(d => {
                const isSelected = selectedDate && format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                return (
                  <button key={d.toISOString()} onClick={() => { setSelectedDate(d); setSelectedTime(null) }}
                    className={`flex-shrink-0 flex flex-col items-center rounded-2xl px-4 py-3 border min-w-[64px] transition-all ${isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-gray-100 text-gray-700'}`}>
                    <span className="text-xs opacity-70">{format(d, 'EEE', { locale: ru })}</span>
                    <span className="text-lg font-bold leading-none mt-0.5">{format(d, 'd')}</span>
                    <span className="text-xs opacity-70">{format(d, 'MMM', { locale: ru })}</span>
                  </button>
                )
              })}
            </div>

            {selectedDate && (
              <>
                <h2 className="font-bold text-gray-900 mt-5 mb-3">Выберите время</h2>
                {slots.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">Нет свободного времени</p>}
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(slot => {
                    const isSelected = selectedTime === slot.time
                    return (
                      <button key={slot.time} disabled={slot.busy} onClick={() => setSelectedTime(slot.time)}
                        className={`rounded-xl py-3 text-sm font-semibold border transition-all
                          ${slot.busy ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through' :
                          isSelected ? 'bg-rose-600 text-white border-rose-600' :
                          'bg-white text-gray-700 border-gray-200 active:scale-95'}`}>
                        {slot.time}
                      </button>
                    )
                  })}
                </div>
                {selectedTime && (
                  <div className="mt-4 bg-rose-50 rounded-2xl p-3 text-sm text-rose-700 font-medium text-center">
                    {format(selectedDate, 'd MMMM', { locale: ru })}, {selectedTime} – {formatEndTime(selectedTime, selectedService.duration)}
                    {' '}· {selectedService.name}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Contacts + Deposit */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900">Ваши контакты</h2>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Ваше имя *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Айгерим"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Номер телефона *</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 777 000 00 00" type="tel"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Комментарий (необязательно)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Пожелания к записи..."
                rows={2}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-rose-400 resize-none" />
            </div>

            {/* Deposit section */}
            {master?.deposit_required && master.deposit_amount > 0 && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="font-bold text-sm text-amber-800 mb-2">💰 Оплата депозита</p>
                <p className="text-xs text-amber-700 mb-3">
                  Переведите <strong>{master.deposit_amount.toLocaleString()} ₸</strong> на номер мастера и загрузите скриншот чека
                </p>
                <div className="bg-white rounded-xl p-3 mb-3 text-sm border border-amber-200">
                  <p className="text-gray-500 text-xs mb-1">Номер для перевода</p>
                  <p className="font-bold text-gray-900">+{master.phone}</p>
                  <p className="text-gray-500 text-xs mt-2 mb-1">Сумма депозита</p>
                  <p className="font-bold text-rose-600">{master.deposit_amount.toLocaleString()} ₸</p>
                </div>

                {/* Receipt upload */}
                {!receipt ? (
                  <button onClick={() => receiptRef.current?.click()}
                    className="w-full border-2 border-dashed border-amber-300 rounded-xl py-4 flex flex-col items-center gap-2 text-amber-700">
                    <Upload size={22} />
                    <span className="text-sm font-semibold">Загрузить чек об оплате</span>
                    <span className="text-xs text-amber-500">Скриншот перевода из банка</span>
                  </button>
                ) : (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={receipt} alt="receipt" className="w-full max-h-48 object-cover" />
                    <button onClick={() => setReceipt(null)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white">
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white rounded-lg px-3 py-1 text-xs font-semibold flex items-center gap-1">
                      <Check size={12} /> Чек загружен
                    </div>
                  </div>
                )}
                <input ref={receiptRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptFile} />
              </div>
            )}

            {/* Summary */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2 text-sm">
              <p className="font-bold text-gray-900 mb-3">Итог записи</p>
              <div className="flex justify-between">
                <span className="text-gray-500">Мастер</span>
                <span className="font-medium">{master.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Услуга</span>
                <span className="font-medium text-right ml-4">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Дата и время</span>
                <span className="font-medium">
                  {selectedDate && format(selectedDate, 'd MMM', { locale: ru })}, {selectedTime}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-700">Стоимость</span>
                <span className="text-rose-600">{selectedService?.price.toLocaleString()} ₸</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent">
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 ? !canProceedStep1() : !canProceedStep2()}
            className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Далее
          </button>
        ) : (
          <button
            onClick={submitBooking}
            disabled={!canProceedStep3()}
            className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Отправить заявку
          </button>
        )}
      </div>
    </div>
  )
}
