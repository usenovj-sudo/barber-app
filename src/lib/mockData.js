// Демо-данные для работы без Supabase
export const MOCK_SALONS = [
  {
    id: '1',
    name: 'BarberPro',
    address: 'ул. Ленина, 12',
    lat: 55.7558,
    lng: 37.6173,
    photo: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&q=80',
    rating: 4.8,
    reviews_count: 124,
    phone: '+7 (999) 123-45-67',
    work_start: '09:00',
    work_end: '19:00',
  },
  {
    id: '2',
    name: 'Classic Cut',
    address: 'пр. Мира, 45',
    lat: 55.7700,
    lng: 37.6300,
    photo: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
    rating: 4.5,
    reviews_count: 87,
    phone: '+7 (999) 987-65-43',
    work_start: '09:00',
    work_end: '19:00',
  },
]

export const MOCK_MASTERS = [
  {
    id: 'm1',
    salon_id: '1',
    name: 'Александр Петров',
    level: 'Senior',
    specialization: 'Стрижки, борода',
    bio: 'Мастер с 10-летним опытом. Специализируюсь на мужских стрижках и оформлении бороды.',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80',
    rating: 4.9,
    reviews_count: 89,
    accepts_children: true,
    phone: '79991112233',
  },
  {
    id: 'm2',
    salon_id: '1',
    name: 'Дмитрий Иванов',
    level: 'Middle',
    specialization: 'Стрижки',
    bio: 'Опыт 5 лет. Работаю только со взрослыми клиентами.',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    rating: 4.6,
    reviews_count: 45,
    accepts_children: false,
    phone: '79994445566',
  },
  {
    id: 'm3',
    salon_id: '2',
    name: 'Сергей Козлов',
    level: 'Junior',
    specialization: 'Стрижки, укладка',
    bio: 'Молодой мастер, слежу за трендами.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    rating: 4.3,
    reviews_count: 23,
    accepts_children: true,
    phone: '79997778899',
  },
]

export const MOCK_SERVICES = [
  { id: 's1', master_id: 'm1', name: 'Стрижка взрослая', category: 'adult', price: 500, duration: 30, active: true },
  { id: 's2', master_id: 'm1', name: 'Стрижка детская', category: 'child', price: 350, duration: 30, active: true },
  { id: 's3', master_id: 'm1', name: 'Стрижка + борода', category: 'adult', price: 700, duration: 60, active: true },
  { id: 's4', master_id: 'm1', name: 'Оформление бороды', category: 'adult', price: 300, duration: 30, active: true },
  { id: 's5', master_id: 'm2', name: 'Стрижка взрослая', category: 'adult', price: 450, duration: 30, active: true },
  { id: 's6', master_id: 'm2', name: 'Стрижка + борода', category: 'adult', price: 650, duration: 60, active: true },
  { id: 's7', master_id: 'm3', name: 'Стрижка взрослая', category: 'adult', price: 400, duration: 30, active: true },
  { id: 's8', master_id: 'm3', name: 'Стрижка детская', category: 'child', price: 300, duration: 30, active: true },
]

export const MOCK_REVIEWS = [
  { id: 'r1', master_id: 'm1', client_name: 'Иван М.', rating: 5, text: 'Отличная стрижка, рекомендую!', date: '2026-06-01' },
  { id: 'r2', master_id: 'm1', client_name: 'Андрей К.', rating: 5, text: 'Профессионал своего дела.', date: '2026-05-28' },
  { id: 'r3', master_id: 'm1', client_name: 'Михаил Р.', rating: 4, text: 'Хорошая работа, приду ещё.', date: '2026-05-20' },
  { id: 'r4', master_id: 'm2', client_name: 'Пётр С.', rating: 5, text: 'Очень доволен!', date: '2026-06-05' },
  { id: 'r5', master_id: 'm2', client_name: 'Алексей В.', rating: 4, text: 'Всё чётко, без лишних слов.', date: '2026-05-30' },
  { id: 'r6', master_id: 'm3', client_name: 'Николай Т.', rating: 4, text: 'Хорошо постриг, цена приятная.', date: '2026-06-08' },
]

// Генерация бронирований для демо
const today = new Date()
const fmt = (d) => d.toISOString().split('T')[0]

export const MOCK_BOOKINGS = [
  { id: 'b1', master_id: 'm1', client_name: 'Иван Петров', client_phone: '+79991234567', date: fmt(today), start_time: '10:00', end_time: '10:30', service_id: 's1', status: 'confirmed', comment: '' },
  { id: 'b2', master_id: 'm1', client_name: 'Андрей Смирнов', client_phone: '+79997654321', date: fmt(today), start_time: '11:00', end_time: '11:30', service_id: 's4', status: 'confirmed', comment: '' },
  { id: 'b3', master_id: 'm1', client_name: 'Михаил Козлов', client_phone: '+79998765432', date: fmt(today), start_time: '14:00', end_time: '15:00', service_id: 's3', status: 'pending', comment: 'Хочу немного короче' },
  { id: 'b4', master_id: 'm2', client_name: 'Пётр Иванов', client_phone: '+79993456789', date: fmt(today), start_time: '10:30', end_time: '11:00', service_id: 's5', status: 'confirmed', comment: '' },
]

export const MOCK_BLOCKS = [
  { id: 'bl1', master_id: 'm1', date: fmt(today), start_time: '12:00', end_time: '12:30', reason: 'Личные дела' },
]
