// Авторизация beauty-мастера. Пароль проверяется на сервере (Supabase RPC),
// сессия хранится локально в браузере.
import { supabase } from './supabase'

const KEY_SESSION = 'beauty_session_master'

function normalizePhone(phone) {
  return phone.replace(/\D/g, '')
}

function buildSession(master) {
  return {
    id: master.id,
    master_id: master.id,
    name: master.name,
    phone: master.phone,
    role: 'beauty_master',
  }
}

export const beautyMasterAuth = {
  async register({ name, phone, password, specialization, city }) {
    const p = normalizePhone(phone)
    if (p.length < 10) return { error: 'Введите корректный номер телефона' }
    if (!password || password.length < 4) return { error: 'Пароль минимум 4 символа' }
    if (!name?.trim()) return { error: 'Введите имя' }

    const username = transliterate(name.trim()) + '_' + Date.now().toString().slice(-4)

    const { data, error } = await supabase.rpc('beauty_register', {
      p_name: name.trim(),
      p_phone: p,
      p_password: password,
      p_specialization: specialization || 'nails',
      p_city: city?.trim() || '',
      p_username: username,
    })

    if (error) return { error: 'Ошибка сервера. Попробуйте позже.' }
    if (data?.error) return { error: data.error }

    const session = buildSession(data)
    localStorage.setItem(KEY_SESSION, JSON.stringify(session))
    return { user: session }
  },

  async login({ phone, password }) {
    const p = normalizePhone(phone)

    const { data, error } = await supabase.rpc('beauty_login', {
      p_phone: p,
      p_password: password,
    })

    if (error) return { error: 'Ошибка сервера. Попробуйте позже.' }
    if (data?.error) return { error: data.error }

    const session = buildSession(data)
    localStorage.setItem(KEY_SESSION, JSON.stringify(session))
    return { user: session }
  },

  current() {
    return JSON.parse(localStorage.getItem(KEY_SESSION) || 'null')
  },

  logout() {
    localStorage.removeItem(KEY_SESSION)
  },
}

function transliterate(str) {
  const map = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch',
    'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    'ә':'a','ғ':'g','қ':'k','ң':'n','ө':'o','ұ':'u','ү':'u','һ':'h','і':'i',
    ' ':'_',
  }
  return str.toLowerCase().split('').map(c => map[c] ?? c).join('').replace(/[^a-z0-9_]/g, '')
}
