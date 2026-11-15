import { expect, test } from 'vitest'
import { isE164, parseNumber, toE164 } from './format'

test('toE164 normalizes MX numbers', () => {
  expect(toE164('55 1234 5678')).toBe('+525512345678')
  expect(toE164('+1 (415) 212-7777')).toBe('+14152127777')
  expect(isE164(toE164('55 1234 5678'))).toBe(true)
  expect(isE164(toE164('123'))).toBe(false)
})

test('parseNumber accepts comma decimals', () => {
  expect(parseNumber('12,5')).toBe(12.5)
  expect(parseNumber('')).toBeNaN()
})
