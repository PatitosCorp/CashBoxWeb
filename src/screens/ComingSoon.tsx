import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui'

export function ComingSoon({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <Card title={title}>
      <p className="text-text-secondary">{t('home.comingSoon')}</p>
    </Card>
  )
}
