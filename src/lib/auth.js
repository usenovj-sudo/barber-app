// Авторизация: телефон как логин + пароль. Отдельно для клиентов и мастеров.
import { MOCK_MASTERS, MOCK_SERVICES } from './mockData'

const KEY_CLIENTS = 'barber_client_accounts'
const KEY_MASTERS = 'barber_master_accounts'
const KEY_SESSION_CLIENT = 'barber_session_client'
const KEY_SESSION_MASTER = 'barber_session_master'

function normalizePhone(phone) {
  return phone.replace(/\D/g, '') // только цифры
}

function read(key) {
  return JSON.parse(localStorage.getItem(key) || '[]')
}
function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ---------- КЛИЕНТ ----------
export const clientAuth = {
  register({ name, phone, password }) {
    const p = normalizePhone(phone)
    if (p.length < 10) return { error: 'Введите корректный номер телефона' }
    if (!password || password.length < 4) return { error: 'Пароль минимум 4 символа' }
    if (!name?.trim()) return { error: 'Введите имя' }
    const accounts = read(KEY_CLIENTS)
    if (accounts.find(a => a.phone === p)) return { error: 'Этот телефон уже зарегистрирован' }
    const user = { id: 'c' + Date.now(), name: name.trim(), phone: p, password }
    accounts.push(user)
    write(KEY_CLIENTS, accounts)
    const session = { id: user.id, name: user.name, phone: p, role: 'client' }
    write(KEY_SESSION_CLIENT, session)
    return { user: session }
  },

  login({ phone, password }) {
    const p = normalizePhone(phone)
    const accounts = read(KEY_CLIENTS)
    const user = accounts.find(a => a.phone === p)
    if (!user) return { error: 'Аккаунт не найден. Зарегистрируйтесь.' }
    if (user.password !== password) return { error: 'Неверный пароль' }
    const session = { id: user.id, name: user.name, phone: p, role: 'client' }
    write(KEY_SESSION_CLIENT, session)
    return { user: session }
  },

  current() {
    return JSON.parse(localStorage.getItem(KEY_SESSION_CLIENT) || 'null')
  },
  logout() {
    localStorage.removeItem(KEY_SESSION_CLIENT)
  },
}

// ---------- МАСТЕР ----------
export const masterAuth = {
  register({ name, phone, password, specialization }) {
    const p = normalizePhone(phone)
    if (p.length < 10) return { error: 'Введите корректный номер телефона' }
    if (!password || password.length < 4) return { error: 'Пароль минимум 4 символа' }
    if (!name?.trim()) return { error: 'Введите имя' }
    const accounts = read(KEY_MASTERS)
    if (accounts.find(a => a.phone === p)) return { error: 'Этот телефон уже зарегистрирован' }

    const masterId = 'm' + Date.now()
    const user = {
      id: masterId, master_id: masterId,
      name: name.trim(), phone: p, password,
      specialization: specialization?.trim() || 'Стрижки',
    }
    accounts.push(user)
    write(KEY_MASTERS, accounts)

    // создаём профиль мастера (виден клиентам)
    const masters = getRegisteredMasters()
    masters.push({
      id: masterId,
      salon_id: '1', // по умолчанию первый салон
      name: user.name,
      level: 'Junior',
      specialization: user.specialization,
      bio: 'Новый мастер.',
      photo: 'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=200&q=80',
      phone: p,
      rating: 0,
      reviews_count: 0,
      accepts_children: true,
      self_registered: true,
    })
    saveRegisteredMasters(masters)

    const session = { id: user.id, master_id: masterId, name: user.name, phone: p, role: 'master' }
    write(KEY_SESSION_MASTER, session)
    return { user: session }
  },

  login({ phone, password }) {
    const p = normalizePhone(phone)
    const accounts = read(KEY_MASTERS)
    const user = accounts.find(a => a.phone === p)
    if (!user) return { error: 'Аккаунт не найден. Зарегистрируйтесь.' }
    if (user.password !== password) return { error: 'Неверный пароль' }
    const session = { id: user.id, master_id: user.master_id, name: user.name, phone: p, role: 'master' }
    write(KEY_SESSION_MASTER, session)
    return { user: session }
  },

  current() {
    return JSON.parse(localStorage.getItem(KEY_SESSION_MASTER) || 'null')
  },
  logout() {
    localStorage.removeItem(KEY_SESSION_MASTER)
  },
}

// ---------- МАСТЕРА (демо + зарегистрированные) ----------
const KEY_REG_MASTERS = 'barber_registered_masters'

export function getRegisteredMasters() {
  return JSON.parse(localStorage.getItem(KEY_REG_MASTERS) || '[]')
}
export function saveRegisteredMasters(data) {
  localStorage.setItem(KEY_REG_MASTERS, JSON.stringify(data))
}

// Все мастера = демо + самозарегистрированные
export function getAllMasters() {
  return [...MOCK_MASTERS, ...getRegisteredMasters()]
}

export function getMasterById(id) {
  return getAllMasters().find(m => m.id === id)
}

// Поиск мастера по имени или телефону
export function searchMasters(query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const digits = q.replace(/\D/g, '')
  return getAllMasters().filter(m => {
    const byName = m.name.toLowerCase().includes(q)
    const byPhone = digits.length >= 3 && (m.phone || '').includes(digits)
    return byName || byPhone
  })
}

// Услуги мастера: сохранённые в localStorage имеют приоритет над демо
export function getServicesForMaster(masterId) {
  const saved = localStorage.getItem('barber_services_' + masterId)
  if (saved) return JSON.parse(saved)
  return MOCK_SERVICES.filter(s => s.master_id === masterId)
}
