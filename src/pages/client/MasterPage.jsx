import { useParams, useNavigate } from 'react-router-dom'
import { MOCK_REVIEWS } from '../../lib/mockData'
import { getMasterById, getServicesForMaster } from '../../lib/auth'
import PageHeader from '../../components/PageHeader'
import Stars from '../../components/Stars'
import LevelBadge from '../../components/LevelBadge'
import { Calendar } from 'lucide-react'

export default function MasterPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const master = getMasterById(id)
  const services = getServicesForMaster(id).filter(s => s.active)
  const reviews = MOCK_REVIEWS.filter(r => r.master_id === id)

  if (!master) return <div className="p-4">Мастер не найден</div>

  const minPrice = services.length ? Math.min(...services.map(s => s.price)) : 0

  return (
    <div className="pb-28">
      <PageHeader title={master.name} />

      {/* Шапка мастера */}
      <div className="px-4 py-5 flex gap-4 items-start">
        <img src={master.photo} alt={master.name}
             className="w-24 h-24 rounded-2xl object-cover shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <LevelBadge level={master.level} />
            {master.accepts_children
              ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">👶 Дети</span>
              : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">🚫 Только взрослые</span>
            }
          </div>
          <p className="text-sm text-gray-600 mb-1">{master.specialization}</p>
          <div className="flex items-center gap-2">
            <Stars rating={master.rating} />
            <span className="text-sm font-semibold">{master.rating}</span>
            <span className="text-xs text-gray-400">({master.reviews_count} отзывов)</span>
          </div>
          <p className="text-sm font-semibold text-[#1a1a2e] mt-1">от {minPrice} ₸</p>
        </div>
      </div>

      {/* Описание */}
      <div className="px-4 mb-4">
        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{master.bio}</p>
      </div>

      {/* Услуги */}
      <div className="px-4 mb-4">
        <h2 className="font-bold text-gray-900 mb-3">Услуги и цены</h2>
        <div className="space-y-2">
          {services.map(s => (
            <div key={s.id} className="flex justify-between items-center bg-white border border-gray-100 rounded-xl px-4 py-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                <p className="text-xs text-gray-400">
                  {s.category === 'child' ? '👶 детская' : s.category === 'adult' ? '👤 взрослая' : '👤👶'}
                  &nbsp;· {s.duration} мин
                </p>
              </div>
              <span className="font-bold text-[#1a1a2e]">{s.price} ₸</span>
            </div>
          ))}
        </div>
      </div>

      {/* Отзывы */}
      <div className="px-4 mb-4">
        <h2 className="font-bold text-gray-900 mb-3">Отзывы</h2>
        {reviews.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Пока нет отзывов</p>
        )}
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-gray-800">{r.client_name}</span>
                <span className="text-xs text-gray-400">{r.date}</span>
              </div>
              <Stars rating={r.rating} size={13} />
              <p className="text-sm text-gray-600 mt-1">{r.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Кнопка записи */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 p-4"
           style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 16px)` }}>
        <button
          onClick={() => navigate(`/booking/${master.id}`)}
          className="w-full bg-[#1a1a2e] text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <Calendar size={20} /> Записаться
        </button>
      </div>
    </div>
  )
}
