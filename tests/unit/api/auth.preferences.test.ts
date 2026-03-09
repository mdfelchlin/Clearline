import { describe, it, expect } from 'vitest'

// User preferences validation tests

type Theme = 'light' | 'dark'

interface UserPreferencesInput {
  theme?: Theme
  display_name?: string
  notification_preferences?: Record<string, boolean>
}

function validatePreferences(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['Input must be an object'] }
  }

  const prefs = input as Record<string, unknown>

  if (prefs.theme !== undefined && !['light', 'dark'].includes(prefs.theme as string)) {
    errors.push('theme must be light or dark')
  }

  if (prefs.display_name !== undefined) {
    if (typeof prefs.display_name !== 'string') {
      errors.push('display_name must be a string')
    } else if ((prefs.display_name as string).length > 100) {
      errors.push('display_name must be 100 characters or less')
    }
  }

  if (prefs.notification_preferences !== undefined) {
    if (typeof prefs.notification_preferences !== 'object' || prefs.notification_preferences === null) {
      errors.push('notification_preferences must be an object')
    }
  }

  return { valid: errors.length === 0, errors }
}

function applyTheme(currentTheme: Theme, newTheme: Theme | undefined): Theme {
  return newTheme ?? currentTheme
}

describe('validatePreferences', () => {
  it('accepts valid theme update', () => {
    const result = validatePreferences({ theme: 'dark' })
    expect(result.valid).toBe(true)
  })

  it('accepts light theme', () => {
    const result = validatePreferences({ theme: 'light' })
    expect(result.valid).toBe(true)
  })

  it('rejects invalid theme', () => {
    const result = validatePreferences({ theme: 'blue' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('theme must be light or dark')
  })

  it('accepts valid display_name', () => {
    const result = validatePreferences({ display_name: 'John Doe' })
    expect(result.valid).toBe(true)
  })

  it('rejects display_name over 100 chars', () => {
    const result = validatePreferences({ display_name: 'a'.repeat(101) })
    expect(result.valid).toBe(false)
  })

  it('accepts valid notification_preferences', () => {
    const result = validatePreferences({ notification_preferences: { email: true } })
    expect(result.valid).toBe(true)
  })

  it('rejects non-object notification_preferences', () => {
    const result = validatePreferences({ notification_preferences: 'yes' })
    expect(result.valid).toBe(false)
  })

  it('accepts empty object', () => {
    const result = validatePreferences({})
    expect(result.valid).toBe(true)
  })
})

describe('applyTheme', () => {
  it('applies new theme when provided', () => {
    expect(applyTheme('light', 'dark')).toBe('dark')
  })

  it('keeps current theme when new theme is undefined', () => {
    expect(applyTheme('dark', undefined)).toBe('dark')
  })
})
