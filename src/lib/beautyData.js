export const BEAUTY_CATEGORIES = [
  { id: 'nails', label: 'Ногти', icon: '💅' },
  { id: 'lashes', label: 'Ресницы', icon: '👁️' },
  { id: 'brows', label: 'Брови', icon: '✨' },
  { id: 'depilation', label: 'Депиляция', icon: '🌿' },
  { id: 'makeup', label: 'Макияж', icon: '💄' },
  { id: 'skincare', label: 'Уход за лицом', icon: '🧴' },
]

const today = new Date()
const fmt = (d) => d.toISOString().split('T')[0]
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

export const DEMO_MASTER_ID = 'beauty_demo_master'

export const DEMO_MASTER_PROFILE = {
  id: DEMO_MASTER_ID,
  name: 'Айгерим Касымова',
  username: 'aigerim_nails',
  specialization: 'nails',
  city: 'Алматы',
  bio: 'Мастер маникюра и педикюра с 6-летним опытом. Работаю с гель-лаком, наращиванием, дизайном. Использую только безопасные материалы.',
  photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80',
  phone: '77771234567',
  telegram: 'aigerim_nails',
  rating: 4.9,
  reviews_count: 47,
  work_start: '09:00',
  work_end: '19:00',
  deposit_amount: 2000,
  deposit_required: true,
  work_days: [1, 2, 3, 4, 5, 6],
  self_registered: false,
}

export const DEMO_SERVICES = [
  { id: 'bs1', master_id: DEMO_MASTER_ID, name: 'Маникюр с покрытием', category: 'nails', price: 5000, duration: 90, active: true },
  { id: 'bs2', master_id: DEMO_MASTER_ID, name: 'Педикюр с покрытием', category: 'nails', price: 6500, duration: 90, active: true },
  { id: 'bs3', master_id: DEMO_MASTER_ID, name: 'Маникюр + педикюр', category: 'nails', price: 10000, duration: 150, active: true },
  { id: 'bs4', master_id: DEMO_MASTER_ID, name: 'Наращивание ногтей', category: 'nails', price: 12000, duration: 180, active: true },
  { id: 'bs5', master_id: DEMO_MASTER_ID, name: 'Коррекция наращивания', category: 'nails', price: 7000, duration: 120, active: true },
  { id: 'bs6', master_id: DEMO_MASTER_ID, name: 'Снятие покрытия', category: 'nails', price: 1500, duration: 30, active: true },
]

export const DEMO_PORTFOLIO = [
  { id: 'p1', master_id: DEMO_MASTER_ID, url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', caption: 'Нюдовый дизайн', category: 'nails' },
  { id: 'p2', master_id: DEMO_MASTER_ID, url: 'https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=400&q=80', caption: 'Летний дизайн', category: 'nails' },
  { id: 'p3', master_id: DEMO_MASTER_ID, url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', caption: 'Французский маникюр', category: 'nails' },
  { id: 'p4', master_id: DEMO_MASTER_ID, url: 'https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=400&q=80', caption: 'Омбре', category: 'nails' },
]

export const DEMO_REVIEWS = [
  { id: 'br1', master_id: DEMO_MASTER_ID, client_name: 'Дана А.', rating: 5, text: 'Айгерим — лучший мастер! Ногти держатся больше 3 недель, дизайн всегда на высоте!', date: fmt(addDays(today, -3)) },
  { id: 'br2', master_id: DEMO_MASTER_ID, client_name: 'Жансая М.', rating: 5, text: 'Очень аккуратная работа, чисто и быстро. Приду ещё!', date: fmt(addDays(today, -7)) },
  { id: 'br3', master_id: DEMO_MASTER_ID, client_name: 'Камила Н.', rating: 5, text: 'Наращивание держится отлично, рекомендую всем девочкам 💅', date: fmt(addDays(today, -14)) },
  { id: 'br4', master_id: DEMO_MASTER_ID, client_name: 'Арайлым С.', rating: 4, text: 'Хорошая работа, есть парковка рядом. Удобное расписание.', date: fmt(addDays(today, -20)) },
]

export const DEMO_BOOKINGS = [
  {
    id: 'bb1', master_id: DEMO_MASTER_ID, client_name: 'Дана Жакупова',
    client_phone: '77051112233', date: fmt(today),
    start_time: '10:00', end_time: '11:30',
    service_id: 'bs1', service_name: 'Маникюр с покрытием',
    status: 'confirmed', deposit_status: 'paid',
    receipt_url: null, comment: 'Хочу нюдовый цвет',
  },
  {
    id: 'bb2', master_id: DEMO_MASTER_ID, client_name: 'Жансая Мусина',
    client_phone: '77052223344', date: fmt(today),
    start_time: '12:00', end_time: '13:30',
    service_id: 'bs2', service_name: 'Педикюр с покрытием',
    status: 'awaiting_confirmation', deposit_status: 'pending',
    receipt_url: null, comment: '',
  },
  {
    id: 'bb3', master_id: DEMO_MASTER_ID, client_name: 'Камила Нурова',
    client_phone: '77053334455', date: fmt(addDays(today, 1)),
    start_time: '14:00', end_time: '17:00',
    service_id: 'bs4', service_name: 'Наращивание ногтей',
    status: 'awaiting_confirmation', deposit_status: 'pending',
    receipt_url: null, comment: 'Форма миндаль',
  },
]
