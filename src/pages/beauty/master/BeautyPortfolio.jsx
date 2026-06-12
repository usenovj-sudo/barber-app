import { useState, useRef } from 'react'
import { beautyMasterAuth } from '../../../lib/beautyAuth'
import { portfolioStore } from '../../../lib/beautyStore'
import { BEAUTY_CATEGORIES } from '../../../lib/beautyData'
import { Plus, Trash2, X, ImageIcon } from 'lucide-react'

export default function BeautyPortfolio() {
  const user = beautyMasterAuth.current()
  const masterId = user?.master_id
  const [items, setItems] = useState(() => portfolioStore.getForMaster(masterId))
  const [addModal, setAddModal] = useState(false)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [category, setCategory] = useState('nails')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  function reload() { setItems(portfolioStore.getForMaster(masterId)) }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleAdd() {
    if (!preview) return alert('Выберите фото')
    setLoading(true)
    portfolioStore.add(masterId, { url: preview, caption, category })
    setLoading(false)
    setPreview(null)
    setCaption('')
    setAddModal(false)
    reload()
  }

  function remove(id) {
    if (!confirm('Удалить фото?')) return
    portfolioStore.remove(masterId, id)
    reload()
  }

  return (
    <div className="pb-24">
      <div className="bg-white px-4 pt-12 pb-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Портфолио</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} фото</p>
        </div>
        <button onClick={() => setAddModal(true)}
          className="flex items-center gap-2 bg-rose-600 text-white rounded-xl px-4 py-2.5 font-semibold text-sm">
          <Plus size={16} /> Добавить
        </button>
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 px-8">
          <ImageIcon size={48} className="opacity-20 mb-4" />
          <p className="font-semibold text-center">Портфолио пустое</p>
          <p className="text-sm text-center mt-1">Добавьте фото своих работ — клиенты увидят их перед записью</p>
          <button onClick={() => setAddModal(true)}
            className="mt-6 bg-rose-600 text-white rounded-2xl px-6 py-3 font-bold text-sm">
            Добавить первое фото
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {items.map(item => {
          const cat = BEAUTY_CATEGORIES.find(c => c.id === item.category)
          return (
            <div key={item.id} className="relative rounded-2xl overflow-hidden aspect-square bg-gray-100">
              <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-white text-xs font-semibold leading-tight">{item.caption}</p>
                {cat && <p className="text-white/70 text-xs">{cat.icon} {cat.label}</p>}
              </div>
              <button
                onClick={() => remove(item.id)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setAddModal(false)}>
          <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Добавить фото</h3>
              <button onClick={() => setAddModal(false)} className="text-gray-400"><X size={22} /></button>
            </div>

            {/* Image picker */}
            <div
              onClick={() => inputRef.current?.click()}
              className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer mb-4 transition-all
                ${preview ? 'border-transparent p-0 overflow-hidden' : 'border-gray-200 hover:border-rose-400 bg-gray-50'}`}
            >
              {preview
                ? <img src={preview} className="w-full h-full object-cover rounded-2xl" alt="" />
                : <>
                    <ImageIcon size={32} className="text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400 font-medium">Нажмите чтобы выбрать фото</p>
                    <p className="text-xs text-gray-300 mt-1">JPG, PNG до 5 МБ</p>
                  </>
              }
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            {preview && (
              <button onClick={() => setPreview(null)} className="text-xs text-rose-500 mb-3">✕ Выбрать другое фото</button>
            )}

            <div className="mb-3">
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Подпись (необязательно)</label>
              <input value={caption} onChange={e => setCaption(e.target.value)}
                placeholder="Нюдовый маникюр, гель-лак"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-400" />
            </div>

            <div className="mb-5">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Категория</label>
              <div className="flex gap-2 flex-wrap">
                {BEAUTY_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setCategory(cat.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${category === cat.id ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleAdd} disabled={loading || !preview}
              className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold disabled:opacity-50">
              Добавить в портфолио
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
