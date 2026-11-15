import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Card, Field, Input } from '../components/ui'
import { useCreateStore } from '../hooks/useStores'
import { supabase } from '../lib/supabase'

export function CreateStoreScreen() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const create = useCreateStore()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(t('errors.required'))
    setError('')
    create.mutate(name, { onError: () => setError(t('errors.generic')) })
  }

  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">{t('store.createTitle')}</h1>
          <Alert>{t('store.createSubtitle')}</Alert>
          <Field label={t('store.name')} htmlFor="store-name" error={error} required>
            <Input id="store-name" size="large" value={name} onChange={e => setName(e.target.value)}
              placeholder={t('store.namePlaceholder')} status={error ? 'error' : undefined} autoFocus />
          </Field>
          <Button htmlType="submit" variant="primary" size="large" block loading={create.isPending}>{t('store.create')}</Button>
          <Button variant="text" onClick={() => supabase.auth.signOut()}>{t('common.logout')}</Button>
        </form>
      </Card>
    </main>
  )
}
