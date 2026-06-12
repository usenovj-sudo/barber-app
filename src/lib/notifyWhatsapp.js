// Отправка WhatsApp-уведомления мастеру о новой записи.
// Работает через бесплатный сервис CallMeBot (без своего сервера):
// мастер один раз подключает свой номер и получает личный apikey,
// который сохраняется в профиле. Уведомление отправляется из браузера
// клиента в момент записи. Это «best-effort» — если не доставится,
// запись всё равно сохраняется (в приложении уведомление будет всегда).

export async function notifyMasterWhatsapp(master, { clientName, serviceName, date, time }) {
  if (!master?.whatsapp_notify || !master?.whatsapp_apikey || !master?.phone) return

  const text =
    `🔔 Новая запись!\n` +
    `Клиент: ${clientName}\n` +
    `Услуга: ${serviceName}\n` +
    `Когда: ${date} в ${time}`

  const url =
    `https://api.callmebot.com/whatsapp.php` +
    `?phone=${master.phone}` +
    `&text=${encodeURIComponent(text)}` +
    `&apikey=${master.whatsapp_apikey}`

  try {
    // mode: 'no-cors' — запрос уходит, ответ не читаем (CallMeBot без CORS)
    await fetch(url, { mode: 'no-cors' })
  } catch {
    /* доставка не критична — в приложении уведомление останется */
  }
}
