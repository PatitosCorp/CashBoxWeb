import i18n from '../i18n'

export const formatMoney = (n: number) =>
  new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'MXN' }).format(n)

// Accepts "12,5" and "12.5"; NaN when empty or not a number.
export const parseNumber = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')))

// Normalizes a Mexican 10-digit number (or any number with +country code) to E.164.
export function toE164(input: string, defaultCountry = '52') {
  const digits = input.replace(/\D/g, '')
  if (input.trim().startsWith('+')) return `+${digits}`
  return digits.length === 10 ? `+${defaultCountry}${digits}` : `+${digits}`
}
export const isE164 = (s: string) => /^\+[1-9]\d{7,14}$/.test(s)
