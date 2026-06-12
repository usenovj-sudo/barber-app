import { masterStore } from './beautyStore'

const KEY_ACCOUNTS = 'beauty_master_accounts'
const KEY_SESSION = 'beauty_session_master'

function normalizePhone(phone) {
  return phone.replace(/\D/g, '')
}
function read(key) {
  return JSON.parse(localStorage.getItem(key) || '[]')
}
function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export const beautyMasterAuth = {
  register({ name, phone, password, specialization, city }) {
    const p = normalizePhone(phone)
    if (p.length < 10) return { error: 'Введите корректный номер телефона' }
    if (!password || password.length < 4) return { error: 'Пароль минимум 4 символа' }
    if (!name?.trim()) return { error: 'Введите имя' }

    const accounts = read(KEY_ACCOUNTS)
    if (accounts.find(a => a.phone === p)) return { error: 'Этот номер уже зарегистрирован' }

    const masterId = 'bm' + Date.now()
    const username = transliterate(name.trim()) + '_' + masterId.slice(-4)

    const account = { id: masterId, phone: p, password, master_id: masterId }
    accounts.push(account)
    write(KEY_ACCOUNTS, accounts)

    const profile = {
      id: masterId,
      name: name.trim(),
      username,
      phone: p,
      specialization: specialization || 'nails',
      city: city?.trim() || '',
      bio: '',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80',
      rating: 0,
      reviews_count: 0,
      work_start: '09:00',
      work_end: '19:00',
      work_days: [1, 2, 3, 4, 5, 6],
      deposit_percent: 0,
      deposit_required: false,
      self_registered: true,
    }
    masterStore.save(profile)

    const session = { id: masterId, master_id: masterId, name: name.trim(), phone: p, role: 'beauty_master' }
    write(KEY_SESSION, session)
    return { user: session }
  },

  login({ phone, password }) {
    const p = normalizePhone(phone)
    const accounts = read(KEY_ACCOUNTS)
    const account = accounts.find(a => a.phone === p)
    if (!account) return { error: 'Аккаунт не найден. Зарегистрируйтесь.' }
    if (account.password !== password) return { error: 'Неверный пароль' }
    const session = { id: account.id, master_id: account.master_id, name: masterStore.getById(account.master_id)?.name || '', phone: p, role: 'beauty_master' }
    write(KEY_SESSION, session)
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
