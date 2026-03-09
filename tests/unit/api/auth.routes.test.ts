import { describe, it, expect } from 'vitest'

// Auth route input validation logic tests

function validateGoogleAuthInput(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Body must be an object' }
  const b = body as Record<string, unknown>
  if (!b.access_token || typeof b.access_token !== 'string' || (b.access_token as string).trim() === '') {
    return { valid: false, error: 'access_token is required' }
  }
  return { valid: true }
}

function validateEmailAuthInput(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Body must be an object' }
  const b = body as Record<string, unknown>

  if (!b.email || typeof b.email !== 'string') {
    return { valid: false, error: 'email is required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(b.email as string)) {
    return { valid: false, error: 'email must be a valid email address' }
  }

  if (b.password !== undefined) {
    if (typeof b.password !== 'string' || (b.password as string).length < 6) {
      return { valid: false, error: 'password must be at least 6 characters' }
    }
  }

  return { valid: true }
}

describe('validateGoogleAuthInput', () => {
  it('accepts valid access_token', () => {
    expect(validateGoogleAuthInput({ access_token: 'ya29.sometoken' }).valid).toBe(true)
  })

  it('rejects missing access_token', () => {
    expect(validateGoogleAuthInput({}).valid).toBe(false)
  })

  it('rejects empty access_token', () => {
    expect(validateGoogleAuthInput({ access_token: '' }).valid).toBe(false)
  })

  it('rejects null body', () => {
    expect(validateGoogleAuthInput(null).valid).toBe(false)
  })
})

describe('validateEmailAuthInput', () => {
  it('accepts valid email (magic link flow)', () => {
    expect(validateEmailAuthInput({ email: 'user@example.com' }).valid).toBe(true)
  })

  it('accepts valid email + password', () => {
    expect(validateEmailAuthInput({ email: 'user@example.com', password: 'secret123' }).valid).toBe(true)
  })

  it('rejects invalid email format', () => {
    expect(validateEmailAuthInput({ email: 'not-an-email' }).valid).toBe(false)
  })

  it('rejects missing email', () => {
    expect(validateEmailAuthInput({}).valid).toBe(false)
  })

  it('rejects short password', () => {
    expect(validateEmailAuthInput({ email: 'user@example.com', password: 'abc' }).valid).toBe(false)
  })

  it('allows no password (magic link)', () => {
    expect(validateEmailAuthInput({ email: 'user@example.com' }).valid).toBe(true)
  })
})
