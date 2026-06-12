import { DEMO_BOOKINGS, DEMO_MASTER_PROFILE, DEMO_SERVICES, DEMO_PORTFOLIO } from './beautyData'

const KEY_BOOKINGS = 'beauty_bookings'
const KEY_MASTERS = 'beauty_registered_masters'
const KEY_BLOCKS = 'beauty_blocks'

function read(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

if (!localStorage.getItem(KEY_BOOKINGS)) {
  write(KEY_BOOKINGS, DEMO_BOOKINGS)
}

// ──── BOOKINGS ────────────────────────────────────────────────
export const bookingStore = {
  getAll: () => read(KEY_BOOKINGS),

  getForMaster: (masterId) => read(KEY_BOOKINGS).filter(b => b.master_id === masterId),

  add: (booking) => {
    const all = read(KEY_BOOKINGS)
    const newBooking = { ...booking, id: 'bb' + Date.now() }
    write(KEY_BOOKINGS, [...all, newBooking])
    return newBooking
  },

  updateStatus: (id, status) => {
    const updated = read(KEY_BOOKINGS).map(b => b.id === id ? { ...b, status } : b)
    write(KEY_BOOKINGS, updated)
  },

  confirmBooking: (id) => {
    const updated = read(KEY_BOOKINGS).map(b =>
      b.id === id ? { ...b, status: 'confirmed', deposit_status: 'paid' } : b
    )
    write(KEY_BOOKINGS, updated)
  },

  rejectBooking: (id) => {
    const updated = read(KEY_BOOKINGS).map(b =>
      b.id === id ? { ...b, status: 'rejected' } : b
    )
    write(KEY_BOOKINGS, updated)
  },

  attachReceipt: (id, receiptUrl) => {
    const updated = read(KEY_BOOKINGS).map(b =>
      b.id === id ? { ...b, receipt_url: receiptUrl, deposit_status: 'pending' } : b
    )
    write(KEY_BOOKINGS, updated)
  },

  cancel: (id) => {
    const updated = read(KEY_BOOKINGS).map(b =>
      b.id === id ? { ...b, status: 'cancelled' } : b
    )
    write(KEY_BOOKINGS, updated)
  },

  getByPhone: (phone) => {
    const digits = phone.replace(/\D/g, '')
    return read(KEY_BOOKINGS).filter(b => b.client_phone.replace(/\D/g, '') === digits)
  },
}

// ──── BLOCKS ─────────────────────────────────────────────────
export const blockStore = {
  getForMaster: (masterId) => read(KEY_BLOCKS).filter(b => b.master_id === masterId),
  add: (block) => {
    const all = read(KEY_BLOCKS)
    write(KEY_BLOCKS, [...all, { ...block, id: 'bl' + Date.now() }])
  },
  remove: (id) => write(KEY_BLOCKS, read(KEY_BLOCKS).filter(b => b.id !== id)),
}

// ──── MASTERS ─────────────────────────────────────────────────
export const masterStore = {
  getAll: () => {
    const saved = read(KEY_MASTERS)
    const hasdemo = saved.find(m => m.id === DEMO_MASTER_PROFILE.id)
    return hasdemo ? saved : [DEMO_MASTER_PROFILE, ...saved]
  },

  getById: (id) => {
    return masterStore.getAll().find(m => m.id === id) || null
  },

  getByUsername: (username) => {
    return masterStore.getAll().find(m => m.username === username) || null
  },

  save: (profile) => {
    const all = read(KEY_MASTERS).filter(m => m.id !== DEMO_MASTER_PROFILE.id)
    const idx = all.findIndex(m => m.id === profile.id)
    if (idx >= 0) all[idx] = profile
    else all.push(profile)
    write(KEY_MASTERS, all)
  },
}

// ──── SERVICES ────────────────────────────────────────────────
export const serviceStore = {
  getForMaster: (masterId) => {
    const saved = localStorage.getItem('beauty_services_' + masterId)
    if (saved) return JSON.parse(saved)
    return DEMO_SERVICES.filter(s => s.master_id === masterId)
  },

  save: (masterId, services) => {
    localStorage.setItem('beauty_services_' + masterId, JSON.stringify(services))
  },
}

// ──── PORTFOLIO ───────────────────────────────────────────────
export const portfolioStore = {
  getForMaster: (masterId) => {
    const saved = localStorage.getItem('beauty_portfolio_' + masterId)
    if (saved) return JSON.parse(saved)
    return DEMO_PORTFOLIO.filter(p => p.master_id === masterId)
  },

  save: (masterId, items) => {
    localStorage.setItem('beauty_portfolio_' + masterId, JSON.stringify(items))
  },

  add: (masterId, item) => {
    const items = portfolioStore.getForMaster(masterId)
    const newItem = { ...item, id: 'p' + Date.now(), master_id: masterId }
    portfolioStore.save(masterId, [...items, newItem])
    return newItem
  },

  remove: (masterId, id) => {
    portfolioStore.save(masterId, portfolioStore.getForMaster(masterId).filter(p => p.id !== id))
  },
}
