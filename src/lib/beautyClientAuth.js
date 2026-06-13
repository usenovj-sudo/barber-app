import { supabase } from './supabase'

const KEY = 'beauty_session_client'

export const beautyClientAuth = {
  async register({ name, phone, password }) {
    const p = phone.replace(/\D/g, '')
    if (p.length < 10) return { error: 'Введите корректный номер телефона' }
    if (!password || password.length < 4) return { error: 'Пароль минимум 4 символа' }
    if (!name?.trim()) return { error: 'Введите имя' }

    const { data, error } = await supabase.rpc('beauty_client_register', {
      p_name: name.trim(),
      p_phone: p,
      p_password: password,
    })

    if (error) return { error: 'Ошибка сервера. Попробуйте позже.' }
    if (data?.error) return { error: data.error }

    localStorage.setItem(KEY, JSON.stringify(data))
    return { user: data }
  },

  async login({ phone, password }) {
    const p = phone.replace(/\D/g, '')
    const { data, error } = await supabase.rpc('beauty_client_login', {
      p_phone: p,
      p_password: password,
    })

    if (error) return { error: 'Ошибка сервера. Попробуйте позже.' }
    if (data?.error) return { error: data.error }

    localStorage.setItem(KEY, JSON.stringify(data))
    return { user: data }
  },

  current() {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  },

  logout() {
    localStorage.removeItem(KEY)
  },
}
