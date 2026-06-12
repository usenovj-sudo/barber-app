import { useState } from 'react'
import { beautyMasterAuth } from '../../../lib/beautyAuth'
import { masterStore, serviceStore } from '../../../lib/beautyStore'
import { BEAUTY_CATEGORIES } from '../../../lib/beautyData'
import { Share2, Copy, Check, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Send, ExternalLink } from 'lucide-react'

const DURATIONS = [
  { v: 30, l: '30 мин' }, { v: 45, l: '45 мин' }, { v: 60, l: '1 час' },
  { v: 90, l: '1 ч 30 мин' }, { v: 120, l: '2 часа' }, { v: 150, l: '2 ч 30 мин' },
  { v: 180, l: '3 часа' }, { v: 240, l: '4 часа' },
]

export default function BeautyProfile() {
  const user = beautyMasterAuth.current()
  const masterId = user?.master_id
  const [master, setMaster] = useState(() => masterStore.getById(masterId))
  const [services, setServices] = useState(() => serviceStore.getForMaster(masterId))
  const [copied, setCopied] = useState(false)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'nails', price: '', duration: 90, active: true })
  const [editProfile, setEditProfile] = useState(false)
  const [pForm, setPForm] = useState({ bio: master?.bio || '', deposit_amount: master?.deposit_amount || 0, deposit_required: master?.deposit_required || false, telegram: master?.telegram || '', work_start: master?.work_start || '09:00', work_end: master?.work_end || '19:00' })

  const shareUrl = `${window.location.origin}/b/${masterId}`
  const tgBotUrl = `https://t.me/BeautyBookKzBot?start=${masterId}`

  async function handleCopy() {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { alert(shareUrl) }
  }

  async function handleShare() {
    const text = `Записывайся ко мне 💅\n${shareUrl}`
    if (navigator.share) {
      try { await navigator.share({ title: master?.name, text, url: shareUrl }) } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }
  }

  function saveServices(updated) { serviceStore.save(masterId, updated); setServices(updated) }

  function openAdd() {
    setForm({ name: '', category: master?.specialization || 'nails', price: '', duration: 90, active: true })
    setModal({ mode: 'add' })
  }

  function openEdit(s) {
    setForm({ name: s.name, category: s.category, price: String(s.price), duration: s.duration, active: s.active })
    setModal({ mode: 'edit', id: s.id })
  }

  function handleSave() {
    if (!form.name || !form.price) return alert('Заполните название и цену')
    if (modal.mode === 'add') {
      saveServices([...services, { id: 's' + Date.now(), master_id: masterId, ...form, price: Number(form.price) }])
    } else {
      saveServices(services.map(s => s.id === modal.id ? { ...s, ...form, price: Number(form.price) } : s))
    }
    setModal(null)
  }

  function saveProfile() {
    const updated = { ...master, ...pForm, deposit_amount: Number(pForm.deposit_amount) }
    masterStore.save(updated)
    setMaster(updated)
    setEditProfile(false)
  }

  const cat = BEAUTY_CATEGORIES.find(c => c.id === master?.specialization)

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Мой профиль</h1>
      </div>

      {/* Master info */}
      <div className="px-4 py-5 flex gap-4 items-center bg-white border-b border-gray-100">
        <img src={master?.photo} className="w-20 h-20 rounded-2xl object-cover" alt="" />
        <div className="flex-1">
          <h2 className="font-bold text-lg text-gray-900">{master?.name}</h2>
          <p className="text-sm text-rose-600 font-medium mt-0.5">{cat?.icon} {cat?.label}</p>
          {master?.city && <p className="text-xs text-gray-400 mt-0.5">📍 {master.city}</p>}
        </div>
        <button onClick={() => setEditProfile(!editProfile)}
          className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
          <Pencil size={18} />
        </button>
      </div>

      {/* Edit profile panel */}
      {editProfile && (
        <div className="px-4 py-4 bg-rose-50 border-b border-rose-100 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">О себе</label>
            <textarea value={pForm.bio} onChange={e => setPForm({ ...pForm, bio: e.target.value })}
              rows={3} placeholder="Расскажите о своём опыте и специализации..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Начало работы</label>
              <input type="time" value={pForm.work_start} onChange={e => setPForm({ ...pForm, work_start: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Конец работы</label>
              <input type="time" value={pForm.work_end} onChange={e => setPForm({ ...pForm, work_end: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Telegram (без @)</label>
            <input value={pForm.telegram} onChange={e => setPForm({ ...pForm, telegram: e.target.value })}
              placeholder="your_username"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-400" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 flex-1">Требовать депозит</label>
            <button onClick={() => setPForm({ ...pForm, deposit_required: !pForm.deposit_required })}
              className={`relative w-12 h-6 rounded-full transition-colors ${pForm.deposit_required ? 'bg-rose-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pForm.deposit_required ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {pForm.deposit_required && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Сумма депозита (₸)</label>
              <input type="number" value={pForm.deposit_amount} onChange={e => setPForm({ ...pForm, deposit_amount: e.target.value })}
                placeholder="2000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-400" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={saveProfile} className="flex-1 bg-rose-600 text-white rounded-xl py-2.5 font-bold text-sm">Сохранить</button>
            <button onClick={() => setEditProfile(false)} className="px-4 rounded-xl border border-gray-200 text-gray-500 text-sm">Отмена</button>
          </div>
        </div>
      )}

      {/* Share block */}
      <div className="px-4 mt-4">
        <div className="bg-gradient-to-br from-rose-600 to-rose-800 rounded-2xl p-4 text-white">
          <p className="font-bold text-sm mb-1">🔗 Ссылка для записи</p>
          <p className="text-xs text-rose-200 mb-3">Отправьте клиентам — они запишутся без регистрации</p>
          <div className="bg-white/15 rounded-xl px-3 py-2 text-xs break-all mb-3 font-mono">{shareUrl}</div>
          <div className="flex gap-2 mb-3">
            <button onClick={handleShare}
              className="flex-1 bg-white text-rose-700 rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-1.5">
              <Share2 size={15} /> Поделиться
            </button>
            <button onClick={handleCopy}
              className="bg-white/20 text-white rounded-xl px-4 py-2.5 font-semibold text-sm flex items-center justify-center gap-1.5">
              {copied ? <><Check size={15} /> Скопировано</> : <><Copy size={15} /> Копировать</>}
            </button>
          </div>

          {/* Telegram bot link */}
          <div className="border-t border-white/20 pt-3">
            <p className="text-xs text-rose-200 mb-2">Или через Telegram-бот:</p>
            <a href={tgBotUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white/15 rounded-xl py-2.5 text-sm font-semibold text-white">
              <Send size={15} /> Открыть в Telegram
              <ExternalLink size={12} className="opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Мои услуги</h2>
          <button onClick={openAdd}
            className="flex items-center gap-1 bg-rose-600 text-white text-sm px-3 py-2 rounded-xl">
            <Plus size={15} /> Добавить
          </button>
        </div>

        <div className="space-y-2">
          {services.map(s => {
            const c = BEAUTY_CATEGORIES.find(c => c.id === s.category)
            return (
              <div key={s.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 bg-white ${!s.active && 'opacity-50'}`}>
                <div className="text-2xl">{c?.icon || '✨'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    {DURATIONS.find(d => d.v === s.duration)?.l || s.duration + ' мин'} ·{' '}
                    <span className="font-bold text-rose-600">{s.price.toLocaleString()} ₸</span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { const u = services.map(x => x.id === s.id ? { ...x, active: !x.active } : x); saveServices(u) }}>
                    {s.active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-gray-300" />}
                  </button>
                  <button onClick={() => openEdit(s)} className="text-gray-400 p-1"><Pencil size={16} /></button>
                  <button onClick={() => { if (confirm('Удалить услугу?')) saveServices(services.filter(x => x.id !== s.id)) }}
                    className="text-red-400 p-1"><Trash2 size={16} /></button>
                </div>
              </div>
            )
          })}
          {services.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">Добавьте первую услугу</p>
          )}
        </div>
      </div>

      {/* Deposit info */}
      {master?.deposit_required && (
        <div className="px-4 mt-4">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <p className="font-semibold text-sm text-amber-800 mb-1">💰 Депозит активен</p>
            <p className="text-xs text-amber-700">
              Клиенты платят {master.deposit_amount?.toLocaleString()} ₸ депозит при записи и прикрепляют чек об оплате.
            </p>
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        <button onClick={() => { beautyMasterAuth.logout(); window.location.href = '/beauty/pro/login' }}
          className="w-full border border-red-100 text-red-500 rounded-2xl py-4 font-semibold">
          Выйти из аккаунта
        </button>
      </div>

      {/* Service modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{modal.mode === 'add' ? 'Новая услуга' : 'Редактировать'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Название *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Маникюр с покрытием"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-400" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Категория</label>
                <div className="grid grid-cols-3 gap-2">
                  {BEAUTY_CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setForm({ ...form, category: cat.id })}
                      className={`rounded-xl p-2 text-center border text-xs font-medium transition-all ${form.category === cat.id ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Цена (₸) *</label>
                  <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                    type="number" placeholder="5000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-400" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Длительность</label>
                  <select value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-rose-400 bg-white">
                    {DURATIONS.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={handleSave}
              className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold mt-4">
              {modal.mode === 'add' ? 'Добавить' : 'Сохранить'}
            </button>
            <button onClick={() => setModal(null)} className="w-full text-gray-400 py-3 text-sm">Отмена</button>
          </div>
        </div>
      )}
    </div>
  )
}
