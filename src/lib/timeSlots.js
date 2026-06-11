// Генерация слотов рабочего дня
export const WORK_START = 9   // 09:00
export const WORK_END = 19    // 19:00
export const LUNCH_START = 13 // 13:00
export const LUNCH_END = 14   // 14:00
export const SLOT_MINUTES = 30

export function generateSlots() {
  const slots = []
  for (let h = WORK_START; h < WORK_END; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const endH = m + SLOT_MINUTES >= 60 ? h + 1 : h
      const endM = (m + SLOT_MINUTES) % 60
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      const isLunch = h >= LUNCH_START && h < LUNCH_END
      slots.push({ time, endTime, isLunch })
    }
  }
  return slots
}

export function getSlotStatus(slot, date, masterId, bookings, blocks) {
  const now = new Date()
  const slotDate = new Date(`${date}T${slot.time}:00`)

  if (slotDate < now) return 'past'
  if (slot.isLunch) return 'lunch'

  const isBlocked = blocks.some(
    b => b.master_id === masterId && b.date === date &&
         b.start_time <= slot.time && b.end_time > slot.time
  )
  if (isBlocked) return 'blocked'

  const isBusy = bookings.some(
    b => b.master_id === masterId && b.date === date &&
         b.status !== 'cancelled' &&
         b.start_time <= slot.time && b.end_time > slot.time
  )
  if (isBusy) return 'busy'

  return 'free'
}

export function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function isoDate(d) {
  return d.toISOString().split('T')[0]
}

export function getNext14Days() {
  const days = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(isoDate(d))
  }
  return days
}
