import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabase, supabaseAuth } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { authRateLimit } from '../middleware/rateLimit'
import { AuthenticatedRequest } from '../types'
import { logger } from '../lib/logger'

const router = Router()

const googleAuthSchema = z.object({
  access_token: z.string().min(1),
})

const emailAuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
})

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  display_name: z.string().max(100).optional(),
  notification_preferences: z.record(z.boolean()).optional(),
})

async function ensureUserAndAccount(userId: string, email: string) {
  // Check by auth user ID first
  const { data: existingById } = await supabase
    .from('users')
    .select('id, account_id')
    .eq('id', userId)
    .single()

  if (existingById) return existingById

  // Check by email — handles the case where auth user was deleted and recreated
  // (new UUID but same email, stale row in public.users)
  const { data: existingByEmail } = await supabase
    .from('users')
    .select('id, account_id')
    .eq('email', email)
    .single()

  if (existingByEmail) {
    // Stale row from a deleted auth user — delete and re-insert with the new UUID
    // (updating a PK doesn't cascade to FK references in account_members etc.)
    await supabase.from('account_members').delete().eq('user_id', existingByEmail.id)
    await supabase.from('users').delete().eq('id', existingByEmail.id)
    // Fall through to the fresh insert below
  }

  // Insert user first (no account_id yet) so the accounts FK can reference it
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({ id: userId, email })
    .select('id, account_id')
    .single()

  if (userError || !newUser) {
    throw new Error(`Failed to create user: ${userError?.message}`)
  }

  // Now create account with owner_id pointing to the user we just inserted
  const { data: newAccount, error: accountError } = await supabase
    .from('accounts')
    .insert({ owner_id: userId })
    .select('id')
    .single()

  if (accountError || !newAccount) {
    throw new Error(`Failed to create account: ${accountError?.message}`)
  }

  // Update user with the new account_id
  await supabase
    .from('users')
    .update({ account_id: newAccount.id })
    .eq('id', userId)

  // Add owner to account_members
  await supabase
    .from('account_members')
    .insert({ account_id: newAccount.id, user_id: userId, role: 'owner' })

  return { id: userId, account_id: newAccount.id }
}

router.post('/google', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { access_token } = googleAuthSchema.parse(req.body)

    const { data, error } = await supabaseAuth.auth.signInWithIdToken({
      provider: 'google',
      token: access_token,
    })

    if (error || !data.user || !data.session) {
      res.status(401).json({ error: 'Google authentication failed' })
      return
    }

    await ensureUserAndAccount(data.user.id, data.user.email ?? '')

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: { id: data.user.id, email: data.user.email },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request body', details: err.errors })
      return
    }
    logger.error({ err }, 'Google auth error')
    res.status(500).json({ error: 'Authentication failed' })
  }
})

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().max(100).optional(),
})

router.post('/signup', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, display_name } = signUpSchema.parse(req.body)

    // Use admin.createUser so the shared client session is never overwritten
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (adminError) {
      res.status(400).json({ error: adminError.message })
      return
    }

    if (!adminData.user) {
      res.status(500).json({ error: 'Failed to create auth user' })
      return
    }

    await ensureUserAndAccount(adminData.user.id, email)

    if (display_name) {
      await supabase.from('users').update({ display_name }).eq('id', adminData.user.id)
    }

    // Sign in via the auth client to get a session token
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({ email, password })

    if (signInError || !signInData.session) {
      res.status(201).json({ message: 'Account created! Please sign in.' })
      return
    }

    res.status(201).json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user: { id: adminData.user.id, email: adminData.user.email },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: err.errors })
      return
    }
    logger.error({ err }, 'Sign up error')
    res.status(500).json({ error: 'Sign up failed' })
  }
})

router.post('/email', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = emailAuthSchema.parse(req.body)

    let data, error

    if (password) {
      const result = await supabaseAuth.auth.signInWithPassword({ email, password })
      data = result.data
      error = result.error
    } else {
      const result = await supabaseAuth.auth.signInWithOtp({ email })
      data = result.data
      error = result.error

      if (!error) {
        res.json({ message: 'Magic link sent to your email' })
        return
      }
    }

    if (error || !data?.user || !data.session) {
      res.status(401).json({ error: 'Email authentication failed' })
      return
    }

    await ensureUserAndAccount(data.user.id, data.user.email ?? email)

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: { id: data.user.id, email: data.user.email },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request body', details: err.errors })
      return
    }
    logger.error({ err }, 'Email auth error')
    res.status(500).json({ error: 'Authentication failed' })
  }
})

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = z.object({ refresh_token: z.string() }).parse(req.body)

    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token })

    if (error || !data.session) {
      res.status(401).json({ error: 'Invalid or expired refresh token' })
      return
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    logger.error({ err }, 'Token refresh error')
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

router.get('/user', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, theme_preference, notification_preferences, account_id')
      .eq('id', req.user!.id)
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({ user: data })
  } catch (err) {
    logger.error({ err }, 'Get user error')
    res.status(500).json({ error: 'Failed to get user' })
  }
})

router.put('/user/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prefs = preferencesSchema.parse(req.body)

    const updateData: Record<string, unknown> = {}
    if (prefs.theme !== undefined) updateData.theme_preference = prefs.theme
    if (prefs.display_name !== undefined) updateData.display_name = prefs.display_name
    if (prefs.notification_preferences !== undefined)
      updateData.notification_preferences = prefs.notification_preferences

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user!.id)
      .select('id, email, display_name, theme_preference, notification_preferences')
      .single()

    if (error || !data) {
      res.status(500).json({ error: 'Failed to update preferences' })
      return
    }

    res.json({ user: data })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid preferences data', details: err.errors })
      return
    }
    logger.error({ err }, 'Update preferences error')
    res.status(500).json({ error: 'Failed to update preferences' })
  }
})

export default router
