// Слой данных beauty — Supabase (Postgres). Все методы асинхронные.
import { supabase } from './supabase'

// ──── BOOKINGS ────────────────────────────────────────────────
export const bookingStore = {
  getForMaster: async (masterId) => {
    const { data } = await supabase
      .from('beauty_bookings').select('*').eq('master_id', masterId)
    return data || []
  },

  add: async (booking) => {
    const row = { ...booking, id: 'bb' + Date.now() }
    const { data, error } = await supabase
      .from('beauty_bookings').insert(row).select().single()
    if (error) throw error
    return data
  },

  updateStatus: async (id, status) => {
    await supabase.from('beauty_bookings').update({ status }).eq('id', id)
  },

  confirmBooking: async (id) => {
    await supabase.from('beauty_bookings')
      .update({ status: 'confirmed', deposit_status: 'paid' }).eq('id', id)
  },

  rejectBooking: async (id) => {
    await supabase.from('beauty_bookings').update({ status: 'rejected' }).eq('id', id)
  },

  attachReceipt: async (id, receiptUrl) => {
    await supabase.from('beauty_bookings')
      .update({ receipt_url: receiptUrl, deposit_status: 'pending' }).eq('id', id)
  },

  cancel: async (id) => {
    await supabase.from('beauty_bookings').update({ status: 'cancelled' }).eq('id', id)
  },

  getByPhone: async (phone) => {
    const digits = phone.replace(/\D/g, '')
    const { data } = await supabase
      .from('beauty_bookings').select('*').eq('client_phone', digits)
    return data || []
  },
}

// ──── BLOCKS ─────────────────────────────────────────────────
export const blockStore = {
  getForMaster: async (masterId) => {
    const { data } = await supabase
      .from('beauty_blocks').select('*').eq('master_id', masterId)
    return data || []
  },
  add: async (block) => {
    await supabase.from('beauty_blocks').insert({ ...block, id: 'bl' + Date.now() })
  },
  remove: async (id) => {
    await supabase.from('beauty_blocks').delete().eq('id', id)
  },
}

// ──── MASTERS ─────────────────────────────────────────────────
export const masterStore = {
  getById: async (id) => {
    const { data } = await supabase
      .from('beauty_masters').select('*').eq('id', id).maybeSingle()
    return data || null
  },

  getAll: async () => {
    const { data } = await supabase
      .from('beauty_masters').select('*')
      .order('rating', { ascending: false })
    return data || []
  },

  getByUsername: async (username) => {
    const { data } = await supabase
      .from('beauty_masters').select('*').eq('username', username).maybeSingle()
    return data || null
  },

  save: async (profile) => {
    // upsert по id — обновляет профиль целиком
    await supabase.from('beauty_masters').upsert(profile)
  },
}

// ──── SERVICES ────────────────────────────────────────────────
export const serviceStore = {
  getForMaster: async (masterId) => {
    const { data } = await supabase
      .from('beauty_services').select('*').eq('master_id', masterId)
      .order('created_at', { ascending: true })
    return data || []
  },

  // Полная замена списка услуг мастера
  save: async (masterId, services) => {
    await supabase.from('beauty_services').delete().eq('master_id', masterId)
    if (services.length) {
      const rows = services.map(s => ({
        id: s.id, master_id: masterId, name: s.name, category: s.category,
        price: Number(s.price) || 0, duration: s.duration, active: s.active,
      }))
      await supabase.from('beauty_services').insert(rows)
    }
  },
}

// ──── PORTFOLIO ───────────────────────────────────────────────
export const portfolioStore = {
  getForMaster: async (masterId) => {
    const { data } = await supabase
      .from('beauty_portfolio').select('*').eq('master_id', masterId)
      .order('created_at', { ascending: true })
    return data || []
  },

  add: async (masterId, item) => {
    const row = {
      id: 'p' + Date.now(), master_id: masterId,
      url: item.url, caption: item.caption, category: item.category,
    }
    const { data } = await supabase
      .from('beauty_portfolio').insert(row).select().single()
    return data
  },

  remove: async (masterId, id) => {
    await supabase.from('beauty_portfolio').delete().eq('id', id)
  },
}
