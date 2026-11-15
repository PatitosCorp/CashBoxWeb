import { useCallback, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { captchaEnabled, Turnstile } from '../auth/Turnstile'
import { Alert, Button, Card, Field, Input } from '../components/ui'
import { isE164, toE164 } from '../lib/format'
import { supabase } from '../lib/supabase'

export function LoginScreen() {
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const onToken = useCallback((tk: string | null) => setCaptcha(tk), [])

  const sendCode = async (e: FormEvent) => {
    e.preventDefault()
    const e164 = toE164(phone)
    if (!isE164(e164)) return setError(t('errors.invalidPhone'))
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ phone: e164, options: { captchaToken: captcha ?? undefined } })
    setBusy(false)
    if (error) return setError(t('errors.generic'))
    setSentTo(e164)
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (!sentTo || !/^\d{6}$/.test(code)) return setError(t('errors.invalidCode'))
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ phone: sentTo, token: code, type: 'sms' })
    setBusy(false)
    if (error) setError(t('errors.invalidCode')) // on success AuthProvider picks up the session
  }

  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">{t('login.title')}</h1>
        {!sentTo ? (
          <form onSubmit={sendCode} className="flex flex-col gap-4">
            <p className="text-text-secondary">{t('login.subtitle')}</p>
            <Field label={t('login.phone')} htmlFor="phone" error={error}>
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" size="large" value={phone}
                onChange={e => setPhone(e.target.value)} placeholder={t('login.phonePlaceholder')} status={error ? 'error' : undefined} />
            </Field>
            <Turnstile onToken={onToken} />
            <Button htmlType="submit" variant="primary" size="large" block loading={busy} disabled={captchaEnabled && !captcha}>
              {t('login.sendCode')}
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-4">
            <Alert>{t('login.codeSentTo', { phone: sentTo })}</Alert>
            <Field label={t('login.code')} htmlFor="code" error={error}>
              <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} size="large" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))} status={error ? 'error' : undefined} autoFocus />
            </Field>
            <Button htmlType="submit" variant="primary" size="large" block loading={busy}>{t('login.verify')}</Button>
            <Button variant="link" onClick={() => { setSentTo(null); setCode(''); setError('') }}>{t('login.changePhone')}</Button>
          </form>
        )}
      </Card>
    </main>
  )
}
