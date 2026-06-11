import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Clock, Phone } from 'lucide-react'
import { MOCK_SALONS, MOCK_MASTERS } from '../../lib/mockData'
import PageHeader from '../../components/PageHeader'
import Stars from '../../components/Stars'
import LevelBadge from '../../components/LevelBadge'

export default function SalonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const salon = MOCK_SALONS.find(s => s.id === id)
  const masters = MOCK_MASTERS.filter(m => m.salon_id === id)

  if (!salon) return <div className="p-4">Не найдено</div>

  return (
    <div className="pb-24">
      <PageHeader title={salon.name} />

      <img src={salon.photo} alt={salon.name} className="w-full h-48 object-cover" />

      <div className="px-4 py-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
          <MapPin size={14} /> {salon.address}
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
          <Clock size={14} /> Пн–Вс 09:00 – 19:00
        </div>
        <a href={`tel:${salon.phone}`} className="flex items-center gap-2 text-blue-600 text-sm">
          <Phone size={14} /> {salon.phone}
        </a>
      </div>

      <div className="px-4">
        <h2 className="font-bold text-gray-900 text-lg mb-3">Мастера</h2>
        <div className="space-y-3">
          {masters.map(master => (
            <div key={master.id}
                 onClick={() => navigate(`/master/${master.id}`)}
                 className="flex gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 active:scale-[0.98] transition-transform cursor-pointer">
              <img src={master.photo} alt={master.name}
                   className="w-16 h-16 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900">{master.name}</h3>
                  <LevelBadge level={master.level} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{master.specialization}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Stars rating={master.rating} />
                  <span className="text-xs text-gray-500">{master.rating} ({master.reviews_count})</span>
                </div>
                <div className="mt-1">
                  {master.accepts_children
                    ? <span className="text-xs text-green-600">👶 Принимает детей</span>
                    : <span className="text-xs text-gray-400">🚫 Только взрослые</span>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
