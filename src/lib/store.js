// Простое хранилище состояния через localStorage (без Redux)
import { MOCK_BOOKINGS, MOCK_BLOCKS } from './mockData'

const KEY_BOOKINGS = 'barber_bookings'
const KEY_BLOCKS = 'barber_blocks'
const KEY_USER = 'barber_user'

// Инициализация демо-данных
if (!localStorage.getItem(KEY_BOOKINGS)) {
  localStorage.setItem(KEY_BOOKINGS, JSON.stringify(MOCK_BOOKINGS))
}
if (!localStorage.getItem(KEY_BLOCKS)) {
  localStorage.setItem(KEY_BLOCKS, JSON.stringify(MOCK_BLOCKS))
}

export const store = {
  getBookings: () => JSON.parse(localStorage.getItem(KEY_BOOKINGS) || '[]'),
  saveBookings: (data) => localStorage.setItem(KEY_BOOKINGS, JSON.stringify(data)),

  getBlocks: () => JSON.parse(localStorage.getItem(KEY_BLOCKS) || '[]'),
  saveBlocks: (data) => localStorage.setItem(KEY_BLOCKS, JSON.stringify(data)),

  getUser: () => JSON.parse(localStorage.getItem(KEY_USER) || 'null'),
  saveUser: (user) => localStorage.setItem(KEY_USER, JSON.stringify(user)),
  clearUser: () => localStorage.removeItem(KEY_USER),

  addBooking: (booking) => {
    const bookings = store.getBookings()
    bookings.push({ ...booking, id: 'b' + Date.now() })
    store.saveBookings(bookings)
  },

  cancelBooking: (id) => {
    const bookings = store.getBookings().map(b =>
      b.id === id ? { ...b, status: 'cancelled' } : b
    )
    store.saveBookings(bookings)
  },

  addBlock: (block) => {
    const blocks = store.getBlocks()
    blocks.push({ ...block, id: 'bl' + Date.now() })
    store.saveBlocks(blocks)
  },

  removeBlock: (id) => {
    store.saveBlocks(store.getBlocks().filter(b => b.id !== id))
  },

  updateBookingStatus: (id, status) => {
    const bookings = store.getBookings().map(b =>
      b.id === id ? { ...b, status } : b
    )
    store.saveBookings(bookings)
  },
}
