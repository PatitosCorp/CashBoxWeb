import { useEffect, useRef } from 'react'

// Cloudflare Turnstile widget. Supabase verifies the token when CAPTCHA is enabled in the project,
// which protects the SMS endpoint from abuse (SMS pumping).
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
export const captchaEnabled = !!SITE_KEY

type TurnstileApi = { render: (el: HTMLElement, opts: object) => string; remove: (id: string) => void }
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<void> | null = null
function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('turnstile'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let id: string | undefined
    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !el.current || !window.turnstile) return
      id = window.turnstile.render(el.current, {
        sitekey: SITE_KEY,
        callback: (t: string) => onToken(t),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      })
    })
    return () => {
      cancelled = true
      if (id) window.turnstile?.remove(id)
    }
  }, [onToken])

  return SITE_KEY ? <div ref={el} /> : null
}
