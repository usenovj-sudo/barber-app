import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

// Определяем iOS Safari
function isIphoneOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
// Уже установлено (запущено как PWA)?
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [show, setShow] = useState(false)
  const [iosHelp, setIosHelp] = useState(false)

  useEffect(() => {
    if (isStandalone()) return // уже установлено — не показываем
    if (localStorage.getItem('install_dismissed')) return

    // Android / Chrome: ловим системное событие
    const handler = (e) => {
      e.preventDefault()
      setDeferred(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: события нет — показываем подсказку вручную
    if (isIphoneOS()) setShow(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleInstall() {
    if (isIphoneOS()) {
      setIosHelp(true)
      return
    }
    if (deferred) {
      deferred.prompt()
      deferred.userChoice.finally(() => { setShow(false); setDeferred(null) })
    }
  }

  function dismiss() {
    setShow(false)
    localStorage.setItem('install_dismissed', '1')
  }

  if (!show) return null

  return (
    <>
      {/* Баннер */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[456px] z-40
                      bg-[#1a1a2e] text-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <div className="bg-white/15 rounded-xl p-2 shrink-0">
          <Download size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Установите приложение</p>
          <p className="text-xs text-gray-300">Быстрый доступ к записи с телефона</p>
        </div>
        <button onClick={handleInstall}
          className="bg-white text-[#1a1a2e] rounded-xl px-4 py-2 font-bold text-sm shrink-0">
          Установить
        </button>
        <button onClick={dismiss} className="text-gray-400 shrink-0 p-1">
          <X size={18} />
        </button>
      </div>

      {/* Инструкция для iPhone */}
      {iosHelp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setIosHelp(false)}>
          <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-3xl p-6"
               onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 mb-4">Установка на iPhone</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">1</div>
                <p className="text-sm text-gray-700">Нажмите кнопку <Share size={16} className="inline text-blue-600" /> «Поделиться» внизу браузера Safari</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">2</div>
                <p className="text-sm text-gray-700">Выберите <b>«На экран „Домой"»</b></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">3</div>
                <p className="text-sm text-gray-700">Нажмите <b>«Добавить»</b> — иконка появится на экране</p>
              </div>
            </div>
            <button onClick={() => setIosHelp(false)}
              className="w-full bg-[#1a1a2e] text-white rounded-2xl py-4 font-bold mt-6">
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  )
}
