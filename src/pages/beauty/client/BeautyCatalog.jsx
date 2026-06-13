import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { masterStore } from '../../../lib/beautyStore'
import { BEAUTY_CATEGORIES } from '../../../lib/beautyData'
import { MapPin, Star, Navigation, Search, X, ChevronRight, Sparkles } from 'lucide-react'

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km) {
  if (km < 1) return Math.round(km * 1000) + ' м'
  return km.toFixed(1) + ' км'
}

export default function BeautyCatalog({ clientMode = false }) {
  const navigate = useNavigate()
  const [masters, setMasters] = useState([])
  const [loading, setLoading] = useState(true)
  const [clientPos, setClientPos] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const data = await masterStore.getAll()
      if (alive) { setMasters(data); setLoading(false) }
    })()
    // Тихо запрашиваем GPS при загрузке — если разрешено, сортируем по расстоянию
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setClientPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
    return () => { alive = false }
  }, [])

  function requestGps() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setClientPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      () => setGpsLoading(false)
    )
  }

  const filtered = masters
    .filter(m => {
      if (category !== 'all' && m.specialization !== category) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          m.name?.toLowerCase().includes(q) ||
          m.city?.toLowerCase().includes(q) ||
          m.address?.toLowerCase().includes(q)
        )
      }
      return true
    })
    .map(m => ({
      ...m,
      distance: clientPos && m.lat && m.lng
        ? haversine(clientPos.lat, clientPos.lng, Number(m.lat), Number(m.lng))
        : null,
    }))
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance
      if (a.distance !== null) return -1
      if (b.distance !== null) return 1
      return (b.rating || 0) - (a.rating || 0)
    })

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Beauty</h1>
              <p className="text-xs text-gray-400 leading-tight">Запись онлайн</p>
            </div>
          </div>
          {!clientMode && (
            <div className="flex flex-col gap-1 items-end">
              <button onClick={() => navigate('/beauty/pro/login')}
                className="text-xs text-rose-600 font-semibold px-3 py-1.5 border border-rose-200 rounded-xl bg-rose-50">
                Я мастер →
              </button>
              <button onClick={() => navigate('/client/login')}
                className="text-xs text-gray-500 underline">
                Войти как клиент
              </button>
            </div>
          )}
        </div>

        {/* Поиск */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Имя мастера, район, адрес..."
            className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-rose-400 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* GPS + фильтр по категории */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={requestGps}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              clientPos
                ? 'bg-rose-50 border-rose-300 text-rose-600'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <Navigation size={13} className={gpsLoading ? 'animate-spin text-rose-500' : ''} />
            {clientPos ? '📍 Рядом со мной' : gpsLoading ? 'Определяем...' : 'Рядом со мной'}
          </button>
          {clientPos && (
            <button onClick={() => setClientPos(null)} className="text-xs text-gray-400 underline">
              сбросить
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              category === 'all' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            Все
          </button>
          {BEAUTY_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                category === cat.id ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Счётчик */}
      {!loading && (
        <p className="px-4 text-xs text-gray-400 mb-2">
          {clientPos ? `По расстоянию · ` : ''}{filtered.length} мастеров
        </p>
      )}

      {/* Список мастеров */}
      <div className="px-4 space-y-3">
        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-2 animate-pulse">💅</div>
            <p className="text-sm">Загружаем мастеров...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold text-gray-600">Мастера не найдены</p>
            <p className="text-sm mt-1">Попробуйте другой фильтр или поиск</p>
          </div>
        )}

        {filtered.map(m => {
          const cat = BEAUTY_CATEGORIES.find(c => c.id === m.specialization)
          const addressLine = m.address || m.city || ''
          return (
            <button
              key={m.id}
              onClick={() => navigate(`/b/${m.id}`)}
              className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform shadow-sm"
            >
              <img
                src={m.photo}
                className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 bg-gray-100"
                alt={m.name}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 leading-tight">{m.name}</p>
                <p className="text-xs text-rose-600 font-medium mt-0.5">
                  {cat?.icon} {cat?.label}
                </p>

                {addressLine && (
                  <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                    <MapPin size={11} className="flex-shrink-0 mt-0.5 text-gray-400" />
                    <span className="line-clamp-2 leading-tight">{addressLine}</span>
                  </p>
                )}
                {m.address_comment && (
                  <p className="text-xs text-gray-400 mt-0.5 pl-4 truncate italic">
                    {m.address_comment}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {m.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                      <Star size={11} fill="currentColor" />
                      {m.rating}
                      <span className="text-gray-400 font-normal ml-0.5">({m.reviews_count})</span>
                    </span>
                  )}
                  {m.deposit_required && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-lg font-semibold">
                      💰 Бронь
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0 pl-1">
                {m.distance !== null && (
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-xl whitespace-nowrap">
                    {formatDist(m.distance)}
                  </span>
                )}
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
