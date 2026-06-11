import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PageHeader({ title, back = true, right }) {
  const navigate = useNavigate()
  return (
    <div className="sticky top-0 bg-white z-40 flex items-center gap-3 px-4 py-3 border-b border-gray-100"
         style={{ paddingTop: `calc(env(safe-area-inset-top) + 12px)` }}>
      {back && (
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600">
          <ArrowLeft size={22} />
        </button>
      )}
      <h1 className="flex-1 text-lg font-bold text-gray-900 truncate">{title}</h1>
      {right && <div>{right}</div>}
    </div>
  )
}
