import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clientAuth } from '../../lib/auth'

// Личная ссылка мастера: /m/:id
// Если клиент авторизован — сразу на карточку мастера.
// Если нет — на регистрацию, запомнив куда вернуть.
export default function MasterLink() {
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const target = `/master/${id}`
    if (clientAuth.current()) {
      navigate(target, { replace: true })
    } else {
      sessionStorage.setItem('redirect_after_auth', target)
      navigate('/register', { replace: true })
    }
  }, [id, navigate])

  return null
}
