import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { masterStore, serviceStore, portfolioStore } from '../../../lib/beautyStore'
import { DEMO_REVIEWS } from '../../../lib/beautyData'
import { BEAUTY_CATEGORIES } from '../../../lib/beautyData'
import { Star, MapPin, Phone, Calendar, ChevronRight, ImageIcon } from 'lucide-react'

function Stars({ rating }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13} className={i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </span>
  )
}

export default function MasterPublicPage() {
  const { masterId } = useParams()
  const navigate = useNavigate()
  const master = masterStore.getById(masterId)
  const services = serviceStore.getForMaster(masterId).filter(s => s.active)
  const portfolio = portfolioStore.getForMaster(masterId)
  const reviews = DEMO_REVIEWS.filter(r => r.master_id === masterId)

  const [tab, setTab] = useState('services')

  const cat = BEAUTY_CATEGORIES.find(c => c.id === master?.specialization)

  if (!master) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4 px-8 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-gray-900">Мастер не найден</h2>
        <p className="text-gray-500 text-sm">Проверьте ссылку или попросите мастера отправить её заново</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Hero */}
      <div className="bg-white">
        <div className="relative h-48 bg-gradient-to-br from-rose-400 to-rose-700">
          {portfolio[0] && (
            <img src={portfolio[0].url} alt="" className="w-full h-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="px-4 pb-5 -mt-12 relative">
          <div className="flex items-end gap-4">
            <img
              src={master.photo}
              className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-lg"
              alt={master.name}
            />
            <div className="pb-2 flex-1">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{master.name}</h1>
              <p className="text-rose-600 font-medium text-sm">{cat?.icon} {cat?.label}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
            {master.city && (
              <span className="flex items-center gap-1"><MapPin size={14} /> {master.city}</span>
            )}
            {master.rating > 0 && (
              <span className="flex items-center gap-1.5">
                <Stars rating={master.rating} />
                <span className="font-semibold text-gray-700">{master.rating}</span>
                <span className="text-gray-400">({master.reviews_count})</span>
              </span>
            )}
          </div>

          {master.bio && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{master.bio}</p>
          )}

          {/* Contact buttons */}
          {master.phone && (
            <div className="mt-4">
              <a href={`tel:+${master.phone}`}
                className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-700 font-medium">
                <Phone size={15} /> Позвонить
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Deposit notice */}
      {master.deposit_required && master.deposit_percent > 0 && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-800">💰 Запись с бронью {master.deposit_percent}%</p>
          <p className="text-xs text-amber-700 mt-1">
            Для подтверждения записи нужно оплатить {master.deposit_percent}% от стоимости услуги и загрузить чек.
            Программа автоматически проверит сумму.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-4 mt-4 bg-white rounded-2xl mx-4 p-1 border border-gray-100">
        {[
          { key: 'services', label: 'Услуги' },
          { key: 'portfolio', label: `Работы (${portfolio.length})` },
          { key: 'reviews', label: `Отзывы (${reviews.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? 'bg-rose-600 text-white' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Services */}
      {tab === 'services' && (
        <div className="px-4 mt-4 space-y-2">
          {services.length === 0 && (
            <p className="text-center text-gray-400 py-8">Услуги не добавлены</p>
          )}
          {services.map(s => {
            const c = BEAUTY_CATEGORIES.find(c => c.id === s.category)
            const hrs = Math.floor(s.duration / 60)
            const mins = s.duration % 60
            const durStr = hrs > 0 ? `${hrs} ч${mins > 0 ? ` ${mins} мин` : ''}` : `${mins} мин`
            return (
              <button key={s.id}
                onClick={() => navigate(`/b/${masterId}/book`, { state: { serviceId: s.id } })}
                className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 text-left active:scale-[0.99] transition-transform">
                <div className="text-2xl">{c?.icon || '✨'}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{durStr}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-600 text-sm">{s.price.toLocaleString()} ₸</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Portfolio */}
      {tab === 'portfolio' && (
        <div className="px-4 mt-4">
          {portfolio.length === 0 && (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <ImageIcon size={40} className="opacity-20 mb-3" />
              <p>Портфолио пока нет</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {portfolio.map(p => (
              <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <img src={p.url} alt={p.caption} className="w-full h-full object-cover" />
                {p.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                    <p className="text-white text-xs font-medium">{p.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {tab === 'reviews' && (
        <div className="px-4 mt-4 space-y-3">
          {reviews.length === 0 && (
            <p className="text-center text-gray-400 py-8">Отзывов пока нет</p>
          )}
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm text-gray-900">{r.client_name}</p>
                <Stars rating={r.rating} />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{r.text}</p>
              <p className="text-xs text-gray-400 mt-2">{r.date}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent">
        <button
          onClick={() => navigate(`/b/${masterId}/book`)}
          className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
        >
          <Calendar size={20} /> Записаться
        </button>
      </div>
    </div>
  )
}
