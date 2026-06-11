import { useState } from 'react'
import { masterAuth, getMasterById, getServicesForMaster } from '../../lib/auth'
import PageHeader from '../../components/PageHeader'
import LevelBadge from '../../components/LevelBadge'
import Stars from '../../components/Stars'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Share2, Copy, Check } from 'lucide-react'

export default function MasterProfile() {
  const user = masterAuth.current()
  const masterId = user?.master_id || 'm1'
  const master = getMasterById(masterId)

  const KEY = 'barber_services_' + masterId
  const [services, setServices] = useState(() => getServicesForMaster(masterId))
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/m/${masterId}`
  const shareText = `Записывайся ко мне на стрижку 💈\n${shareUrl}`

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: master?.name, text: 'Записывайся ко мне на стрижку 💈', url: shareUrl }) } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert(shareUrl)
    }
  }
  const [modal, setModal] = useState(null) // null | {mode: 'add'|'edit', service?}
  const [form, setForm] = useState({ name: '', category: 'adult', price: '', duration: '30', active: true })

  function saveServices(updated) {
    localStorage.setItem(KEY, JSON.stringify(updated))
    setServices(updated)
  }

  function openAdd() {
    setForm({ name: '', category: 'adult', price: '', duration: '30', active: true })
    setModal({ mode: 'add' })
  }

  function openEdit(s) {
    setForm({ name: s.name, category: s.category, price: String(s.price), duration: String(s.duration), active: s.active })
    setModal({ mode: 'edit', id: s.id })
  }

  function handleSave() {
    if (!form.name || !form.price) return alert('Заполни название и цену')
    if (modal.mode === 'add') {
      saveServices([...services, {
        id: 's' + Date.now(), master_id: masterId,
        name: form.name, category: form.category,
        price: Number(form.price), duration: Number(form.duration), active: form.active
      }])
    } else {
      saveServices(services.map(s => s.id === modal.id
        ? { ...s, name: form.name, category: form.category, price: Number(form.price), duration: Number(form.duration) }
        : s
      ))
    }
    setModal(null)
  }

  function toggleActive(id) {
    saveServices(services.map(s => s.id === id ? { ...s, active: !s.active } : s))
  }

  function deleteService(id) {
    if (confirm('Удалить услугу?')) saveServices(services.filter(s => s.id !== id))
  }

  function handleLogout() {
    masterAuth.logout()
    window.location.href = '/pro/login'
  }

  return (
    <div className="pb-24">
      <PageHeader title="Профиль мастера" back={false} />

      {/* Инфо мастера */}
      <div className="px-4 py-5 flex gap-4 items-center">
        <img src={master?.photo} className="w-20 h-20 rounded-2xl object-cover" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-lg text-gray-900">{master?.name}</h2>
          </div>
          <LevelBadge level={master?.level} />
          <div className="flex items-center gap-2 mt-2">
            <Stars rating={master?.rating} size={13} />
            <span className="text-sm text-gray-500">{master?.rating} ({master?.reviews_count})</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {master?.accepts_children ? '👶 Принимает детей' : '🚫 Только взрослые'}
          </p>
        </div>
      </div>

      {/* Личная ссылка для клиентов */}
      <div className="px-4 mb-5">
        <div className="bg-[#0f3460] rounded-2xl p-4 text-white">
          <p className="font-bold text-sm mb-1">🔗 Ваша ссылка для записи</p>
          <p className="text-xs text-blue-200 mb-3">Отправьте клиентам — они откроют запись прямо к вам</p>
          <div className="bg-white/10 rounded-xl px-3 py-2 text-xs break-all mb-3">{shareUrl}</div>
          <div className="flex gap-2">
            <button onClick={handleShare}
              className="flex-1 bg-white text-[#0f3460] rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-1.5">
              <Share2 size={16} /> Поделиться
            </button>
            <button onClick={handleCopy}
              className="bg-white/15 text-white rounded-xl px-4 py-2.5 font-semibold text-sm flex items-center justify-center gap-1.5">
              {copied ? <><Check size={16} /> Скопировано</> : <><Copy size={16} /> Копировать</>}
            </button>
          </div>
        </div>
      </div>

      {/* Услуги */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Мои услуги</h2>
          <button onClick={openAdd}
            className="flex items-center gap-1 bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded-xl">
            <Plus size={15} /> Добавить
          </button>
        </div>

        <div className="space-y-2">
          {services.map(s => (
            <div key={s.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 ${s.active ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-400">
                  {s.category === 'child' ? '👶' : s.category === 'adult' ? '👤' : '👤👶'}
                  {' '}{s.duration} мин · <span className="font-semibold text-[#1a1a2e]">{s.price} ₸</span>
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(s.id)} className="text-gray-400">
                  {s.active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => openEdit(s)} className="text-gray-400 p-1"><Pencil size={16} /></button>
                <button onClick={() => deleteService(s.id)} className="text-red-400 p-1"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6">
        <button onClick={handleLogout}
          className="w-full border border-red-100 text-red-500 rounded-2xl py-4 font-semibold">
          Выйти
        </button>
      </div>

      {/* Модал добавления/редактирования */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end"
             onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-3xl p-6"
               onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">
              {modal.mode === 'add' ? 'Новая услуга' : 'Редактировать услугу'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Название *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Стрижка взрослая"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e]" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Категория</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e] bg-white">
                  <option value="adult">👤 Взрослая</option>
                  <option value="child">👶 Детская</option>
                  <option value="both">👤👶 Для всех</option>
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Цена (₸) *</label>
                  <input value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    type="number" placeholder="500"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e]" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Длительность</label>
                  <select value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1a1a2e] bg-white">
                    <option value="15">15 мин</option>
                    <option value="30">30 мин</option>
                    <option value="45">45 мин</option>
                    <option value="60">1 час</option>
                    <option value="90">1 ч 30 мин</option>
                    <option value="120">2 часа</option>
                    <option value="150">2 ч 30 мин</option>
                    <option value="180">3 часа</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={handleSave}
              className="w-full bg-[#1a1a2e] text-white rounded-2xl py-4 font-bold mt-4">
              {modal.mode === 'add' ? 'Добавить' : 'Сохранить'}
            </button>
            <button onClick={() => setModal(null)} className="w-full text-gray-400 py-3 text-sm">Отмена</button>
          </div>
        </div>
      )}
    </div>
  )
}
