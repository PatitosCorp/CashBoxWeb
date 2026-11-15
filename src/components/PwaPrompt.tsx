import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'

// Asks before reloading so an in-progress sale is never lost to an auto-update.
export function PwaPrompt() {
  const { t } = useTranslation()
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div role="status" className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-modal">
      {t('pwa.update')}
      <Button variant="primary" size="small" onClick={() => updateServiceWorker(true)}>{t('pwa.reload')}</Button>
    </div>
  )
}
