import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Заголовок вкладки зависит от того, какое приложение собрано (VITE_APP).
document.title = import.meta.env.VITE_APP === 'beauty'
  ? 'Beauty Booking — Казахстан'
  : 'BarberBook'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
