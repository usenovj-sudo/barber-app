import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Star, Phone, Navigation } from 'lucide-react'
import { MOCK_SALONS } from '../../lib/mockData'

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)
}

export default function Home() {
  const navigate = useNavigate()
  const [userPos, setUserPos] = useState(null)
  const [locError, setLocError] = useState(false)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocError(true)
    )
  }, [])

  return (
    <div className="pb-24">
      {/* Шапка */}
      <div className="bg-[#1a1a2e] text-white px-4 pt-12 pb-6"
           style={{ paddingTop: `calc(env(safe-area-inset-top) + 24px)` }}>
        <p className="text-sm text-gray-400 mb-1">Привет! 👋</p>
        <h1 className="text-2xl font-bold">Найди своего мастера</h1>
        {locError && (
          <p className="text-xs text-yellow-400 mt-2">
            📍 Разреши геолокацию для отображения расстояния
          </p>
        )}
      </div>

      {/* Список салонов */}
      <div className="px-4 py-4 space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
          Парикмахерские рядом
        </h2>
        {MOCK_SALONS.map(salon => {
          const dist = userPos ? getDistance(userPos.lat, userPos.lng, salon.lat, salon.lng) : null
          return (
            <div key={salon.id}
                 onClick={() => navigate(`/salon/${salon.id}`)}
                 className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer">
              <img src={salon.photo} alt={salon.name}
                   className="w-full h-40 object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{salon.name}</h3>
                    <p className="text-gray-500 text-sm flex items-center gap-1 mt-0.5">
                      <MapPin size={13} className="shrink-0" /> {salon.address}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <span className="font-semibold text-gray-800">{salon.rating}</span>
                    </div>
                    <p className="text-xs text-gray-400">{salon.reviews_count} отзывов</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  {dist ? (
                    <span className="flex items-center gap-1 text-sm text-blue-600">
                      <Navigation size={14} /> {dist} км от вас
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">
                      09:00 – 19:00
                    </span>
                  )}
                  <a href={`tel:${salon.phone}`}
                     onClick={e => e.stopPropagation()}
                     className="flex items-center gap-1 text-sm text-green-600">
                    <Phone size={14} /> Позвонить
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
