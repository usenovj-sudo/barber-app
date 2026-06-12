import { useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { masterStore, serviceStore, bookingStore, blockStore } from '../../../lib/beautyStore'
import { BEAUTY_CATEGORIES } from '../../../lib/beautyData'
import { scanReceipt } from '../../../lib/ocrReceipt'
import { format, addDays, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, Upload, Check, X, ScanLine, AlertCircle, RefreshCw } from 'lucide-react'

function buildSlots(start, end, duration, existingBookings, blocks, date) {
  const slots = []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let cur = sh * 60 + sm
  const endMin = eh * 60 + em

  const bookedRanges = [
    ...existingBookings.filter(b => b.date === date && !['cancelled', 'rejected'].includes(b.status)).map(b => {
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
    const busy = bookedRanges.some(r => cur < r.end && (cur + duration) > r.start)
    slots.push({ time: `${h}:${m}`, busy })
    cur += 30
  }
  return slots
}

function formatEndTime(start, dur) {
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + dur
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// OCR scan states
const SCAN_IDLE = 'idle'
const SCAN_LOADING = 'loading'
const SCAN_OK = 'ok'
const SCAN_LOW = 'low'
const SCAN_FAIL = 'fail'

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
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [comment, setComment] = useState('')

  // Deposit / receipt / OCR state
  const [receiptImg, setReceiptImg] = useState(null)
  const [scanState, setScanState] = useState(SCAN_IDLE)
  const [scanProgress, setScanProgress] = useState(0)
  const [scannedAmount, setScannedAmount] = useState(null)
  const [manualAmount, setManualAmount] = useState('')
  const [showManual, setShowManual] = useState(false)

  const [done, setDone] = useState(false)
  const receiptRef = useRef()

  if (!master) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-3 px-8 text-center">
        <div className="text-5xl">🔍</div>
        <p className="font-bold text-gray-800">Мастер не найден</p>
        <p className="text-sm text-gray-500">Проверьте ссылку или запросите её у мастера</p>
      </div>
    )
  }

  const today = startOfDay(new Date())
  const availableDates = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i + 1))
    .filter(d => {
      const dow = d.getDay()
      return (master?.work_days || [1, 2, 3, 4, 5, 6]).includes(dow === 0 ? 7 : dow)
    })

  const slots = selectedDate && selectedService
    ? buildSlots(master.work_start, master.work_end, selectedService.duration, existingBookings, blocks, format(selectedDate, 'yyyy-MM-dd'))
    : []

  // Deposit logic
  const depositRequired = master.deposit_required && master.deposit_percent > 0
  const requiredDeposit = depositRequired && selectedService
    ? Math.ceil(selectedService.price * master.deposit_percent / 100)
    : 0

  async function handleReceiptFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const dataUrl = ev.target.result
      setReceiptImg(dataUrl)
      setScannedAmount(null)
      setShowManual(false)
      setScanState(SCAN_LOADING)
      setScanProgress(0)
      try {
        const result = await scanReceipt(dataUrl, pct => setScanProgress(pct))
        if (result.found && result.amount >= requiredDeposit) {
          setScannedAmount(result.amount)
          setScanState(SCAN_OK)
        } else if (result.found && result.amount < requiredDeposit) {
          setScannedAmount(result.amount)
          setScanState(SCAN_LOW)
        } else {
          setScannedAmount(null)
          setScanState(SCAN_FAIL)
        }
      } catch {
        setScanState(SCAN_FAIL)
      }
    }
    reader.readAsDataURL(file)
  }

  function resetReceipt() {
    setReceiptImg(null)
    setScanState(SCAN_IDLE)
    setScanProgress(0)
    setScannedAmount(null)
    setManualAmount('')
    setShowManual(false)
    if (receiptRef.current) receiptRef.current.value = ''
  }

  const effectiveAmount = showManual ? Number(manualAmount) : scannedAmount
  const depositOk = !depositRequired || (effectiveAmount && effectiveAmount >= requiredDeposit)

  function canStep1() { return !!selectedService }
  function canStep2() { return selectedDate && selectedTime }
  function canStep3() {
    if (!clientName.trim() || clientPhone.replace(/\D/g, '').length < 10) return false
    if (depositRequired && !depositOk) return false
    if (depositRequired && !receiptImg) return false
    return true
  }

  function submitBooking() {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const endTime = formatEndTime(selectedTime, selectedService.duration)
    bookingStore.add({
      master_id: masterId,
      client_name: clientName.trim(),
      client_phone: clientPhone.replace(/\D/g, ''),
      date: dateStr,
      start_time: selectedTime,
      end_time: endTime,
      service_id: selectedService.id,
      service_name: selectedService.name,
      service_price: selectedService.price,
      deposit_required: depositRequired,
      deposit_percent: master.deposit_percent,
      deposit_amount: requiredDeposit,
      deposit_paid: effectiveAmount || 0,
      deposit_status: depositRequired ? 'paid' : 'not_required',
      receipt_url: receiptImg || null,
      // Auto-confirmed when deposit OK, awaiting otherwise
      status: depositRequired ? 'confirmed' : 'awaiting_confirmation',
      comment,
    })
    setDone(true)
  }

  // ── Done screen ──────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <Check size={36} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {depositRequired ? 'Запись подтверждена!' : 'Заявка отправлена!'}
        </h2>
        <p className="text-gray-500 mb-6 leading-relaxed">
          {depositRequired
            ? `Бронь ${effectiveAmount?.toLocaleString()} ₸ подтверждена. Ждём вас!`
            : `${master.name} получит вашу заявку и скоро подтвердит запись.`}
        </p>

        <div className="w-full bg-white rounded-2xl p-5 border border-gray-100 text-left space-y-3 mb-8">
          <p className="font-bold text-gray-900 text-center mb-3">Детали записи</p>
          <Row label="Услуга" value={selectedService?.name} />
          <Row label="Дата" value={format(selectedDate, 'd MMMM yyyy', { locale: ru })} />
          <Row label="Время" value={`${selectedTime} – ${formatEndTime(selectedTime, selectedService?.duration)}`} />
          <Row label="Стоимость" value={`${selectedService?.price.toLocaleString()} ₸`} bold rose />
          {depositRequired && (
            <Row label="Бронь оплачена" value={`${effectiveAmount?.toLocaleString()} ₸ ✓`} bold />
          )}
        </div>

        <button onClick={() => navigate(`/b/${masterId}`)}
          className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base">
          Вернуться к профилю
        </button>
      </div>
    )
  }

  const cat = BEAUTY_CATEGORIES.find(c => c.id === master.specialization)

  // ── Main booking UI ──────────────────────────────────────
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
        <div className="flex items-center gap-1">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-rose-500' : 'bg-gray-100'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Шаг {step} из 3 · {['Услуга', 'Дата и время', 'Контакты'][step - 1]}
        </p>
      </div>

      <div className="px-4 pt-4">

        {/* ── Step 1: Service ── */}
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
                    <span className={`font-bold text-sm ${isSelected ? 'text-rose-600' : 'text-gray-800'}`}>
                      {s.price.toLocaleString()} ₸
                    </span>
                    {isSelected && <Check size={18} className="text-rose-500" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Step 2: Date & Time ── */}
        {step === 2 && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3">Выберите дату</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
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
                          ${slot.busy ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                            : isSelected ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-gray-700 border-gray-200 active:scale-95'}`}>
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

        {/* ── Step 3: Contacts + Deposit ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900">Ваши контакты</h2>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Ваше имя *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="Айгерим"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Номер телефона *</label>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                placeholder="+7 777 000 00 00" type="tel"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Комментарий (необязательно)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Пожелания к записи..." rows={2}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-rose-400 resize-none" />
            </div>

            {/* ── Deposit block ── */}
            {depositRequired && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-amber-800">💰 Оплата брони</p>
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                    {master.deposit_percent}% от стоимости
                  </span>
                </div>

                <div className="bg-white rounded-xl p-3 space-y-2 text-sm border border-amber-200">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Услуга</span>
                    <span className="font-semibold">{selectedService?.price.toLocaleString()} ₸</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Бронь {master.deposit_percent}%</span>
                    <span className="font-bold text-rose-600 text-base">{requiredDeposit.toLocaleString()} ₸</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between">
                    <span className="text-gray-500">Перевести на номер</span>
                    <span className="font-bold">+{master.phone}</span>
                  </div>
                </div>

                <p className="text-xs text-amber-700">
                  Переведите <strong>{requiredDeposit.toLocaleString()} ₸</strong> на номер выше, затем загрузите скриншот — программа автоматически проверит сумму
                </p>

                {/* Receipt upload / scan */}
                {scanState === SCAN_IDLE && (
                  <button onClick={() => receiptRef.current?.click()}
                    className="w-full border-2 border-dashed border-amber-300 rounded-xl py-4 flex flex-col items-center gap-2 text-amber-700 active:scale-[0.98] transition-transform">
                    <Upload size={22} />
                    <span className="text-sm font-semibold">Загрузить чек об оплате</span>
                    <span className="text-xs text-amber-500">Скриншот из банковского приложения</span>
                  </button>
                )}

                {/* Scanning progress */}
                {scanState === SCAN_LOADING && receiptImg && (
                  <div className="rounded-xl overflow-hidden border border-amber-200">
                    <img src={receiptImg} className="w-full max-h-40 object-cover" alt="" />
                    <div className="bg-white p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ScanLine size={16} className="text-rose-500 animate-pulse" />
                        <span className="text-sm font-semibold text-gray-700">Читаем чек...</span>
                        <span className="text-sm text-gray-400 ml-auto">{scanProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-rose-500 h-1.5 rounded-full transition-all duration-300" style={{ width: scanProgress + '%' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Scan OK */}
                {scanState === SCAN_OK && (
                  <div className="rounded-xl overflow-hidden border border-green-200">
                    <div className="relative">
                      <img src={receiptImg} className="w-full max-h-40 object-cover" alt="" />
                      <button onClick={resetReceipt}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="bg-green-50 p-3 flex items-center gap-2">
                      <Check size={18} className="text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-green-700">
                          Сумма подтверждена: {scannedAmount?.toLocaleString()} ₸
                        </p>
                        <p className="text-xs text-green-600">
                          Требовалось {requiredDeposit.toLocaleString()} ₸ — запись будет подтверждена автоматически
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scan LOW — amount too small */}
                {scanState === SCAN_LOW && (
                  <div className="rounded-xl overflow-hidden border border-red-200">
                    <div className="relative">
                      <img src={receiptImg} className="w-full max-h-40 object-cover" alt="" />
                      <button onClick={resetReceipt}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="bg-red-50 p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-red-600">Сумма недостаточна</p>
                          <p className="text-xs text-red-500">
                            В чеке: {scannedAmount?.toLocaleString()} ₸ · Требуется: {requiredDeposit.toLocaleString()} ₸
                          </p>
                        </div>
                      </div>
                      <button onClick={resetReceipt}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 rounded-xl py-2 text-sm text-red-600 font-semibold">
                        <RefreshCw size={14} /> Загрузить другой чек
                      </button>
                    </div>
                  </div>
                )}

                {/* Scan FAIL — OCR couldn't read */}
                {scanState === SCAN_FAIL && (
                  <div className="rounded-xl overflow-hidden border border-orange-200">
                    <div className="relative">
                      {receiptImg && <img src={receiptImg} className="w-full max-h-40 object-cover" alt="" />}
                      <button onClick={resetReceipt}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="bg-orange-50 p-3 space-y-2">
                      <p className="text-sm font-semibold text-orange-700">Не удалось распознать сумму</p>
                      <p className="text-xs text-orange-600">Введите сумму перевода вручную:</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={manualAmount}
                          onChange={e => { setManualAmount(e.target.value); setShowManual(true) }}
                          placeholder={requiredDeposit.toString()}
                          className="flex-1 border border-orange-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-400"
                        />
                        <span className="flex items-center text-sm font-semibold text-gray-600 pr-1">₸</span>
                      </div>
                      {showManual && Number(manualAmount) < requiredDeposit && Number(manualAmount) > 0 && (
                        <p className="text-xs text-red-500">
                          Минимальная бронь: {requiredDeposit.toLocaleString()} ₸
                        </p>
                      )}
                      {showManual && Number(manualAmount) >= requiredDeposit && (
                        <p className="text-xs text-green-600 font-semibold">
                          ✓ Сумма подтверждена
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <input ref={receiptRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptFile} />
              </div>
            )}

            {/* Summary */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2 text-sm">
              <p className="font-bold text-gray-900 mb-3">Итог записи</p>
              <Row label="Мастер" value={master.name} />
              <Row label="Услуга" value={selectedService?.name} />
              <Row label="Дата и время" value={`${selectedDate ? format(selectedDate, 'd MMM', { locale: ru }) : ''}, ${selectedTime}`} />
              <Row label="Стоимость" value={`${selectedService?.price.toLocaleString()} ₸`} bold rose />
              {depositRequired && (
                <Row label={`Бронь ${master.deposit_percent}%`} value={`${requiredDeposit.toLocaleString()} ₸`} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent">
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 ? !canStep1() : !canStep2()}
            className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-40">
            Далее
          </button>
        ) : (
          <button
            onClick={submitBooking}
            disabled={!canStep3()}
            className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-40">
            {depositRequired ? 'Подтвердить бронь и записаться' : 'Отправить заявку'}
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, bold, rose }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`text-right ml-4 ${bold ? 'font-bold' : 'font-medium'} ${rose ? 'text-rose-600' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  )
}
