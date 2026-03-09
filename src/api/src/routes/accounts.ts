import { Router, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth, requireOwner } from '../middleware/auth'
import { AuthenticatedRequest } from '../types'
import { logger } from '../lib/logger'
import crypto from 'crypto'

const router = Router()

const inviteMemberSchema = z.object({
  email: z.string().email(),
})

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
})

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, owner_id, created_at')
      .eq('id', req.user!.accountId)
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Account not found' })
      return
    }

    res.json({ account: data })
  } catch (err) {
    logger.error({ err }, 'Get account error')
    res.status(500).json({ error: 'Failed to get account' })
  }
})

router.get('/:id/members', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.params.id !== req.user!.accountId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    const { data, error } = await supabase
      .from('account_members')
      .select('user_id, role, created_at, users!inner(id, email, display_name)')
      .eq('account_id', req.params.id)

    if (error) {
      res.status(500).json({ error: 'Failed to get members' })
      return
    }

    res.json({ members: data })
  } catch (err) {
    logger.error({ err }, 'Get members error')
    res.status(500).json({ error: 'Failed to get members' })
  }
})

router.get('/:id/invitations', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.params.id !== req.user!.accountId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    const { data, error } = await supabase
      .from('account_invitations')
      .select('id, email, status, expires_at, created_at')
      .eq('account_id', req.params.id)
      .eq('status', 'pending')

    if (error) {
      res.status(500).json({ error: 'Failed to get invitations' })
      return
    }

    res.json({ invitations: data })
  } catch (err) {
    logger.error({ err }, 'Get invitations error')
    res.status(500).json({ error: 'Failed to get invitations' })
  }
})

router.post('/:id/members', requireAuth, requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.params.id !== req.user!.accountId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    const { email } = inviteMemberSchema.parse(req.body)

    const { data: existing } = await supabase
      .from('account_invitations')
      .select('id')
      .eq('account_id', req.params.id)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (existing) {
      res.status(409).json({ error: 'An invitation is already pending for this email' })
      return
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('account_invitations')
      .insert({
        account_id: req.params.id,
        invited_by_user_id: req.user!.id,
        email,
        token,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select('id, email, status, expires_at, token')
      .single()

    if (error || !data) {
      res.status(500).json({ error: 'Failed to create invitation' })
      return
    }

    res.status(201).json({ invitation: data })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: err.errors })
      return
    }
    logger.error({ err }, 'Create invitation error')
    res.status(500).json({ error: 'Failed to create invitation' })
  }
})

router.delete('/:id/members/:userId', requireAuth, requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.params.id !== req.user!.accountId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    if (req.params.userId === req.user!.id) {
      res.status(400).json({ error: 'Account owner cannot remove themselves' })
      return
    }

    const { error } = await supabase
      .from('account_members')
      .delete()
      .eq('account_id', req.params.id)
      .eq('user_id', req.params.userId)

    if (error) {
      res.status(500).json({ error: 'Failed to remove member' })
      return
    }

    res.status(204).send()
  } catch (err) {
    logger.error({ err }, 'Remove member error')
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

router.post('/invitations/accept', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { token } = acceptInvitationSchema.parse(req.body)

    const { data: invitation, error: invError } = await supabase
      .from('account_invitations')
      .select('id, account_id, email, status, expires_at')
      .eq('token', token)
      .single()

    if (invError || !invitation) {
      res.status(404).json({ error: 'Invitation not found' })
      return
    }

    if (invitation.status !== 'pending') {
      res.status(400).json({ error: 'Invitation is no longer valid' })
      return
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('account_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
      res.status(400).json({ error: 'Invitation has expired' })
      return
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', invitation.email)
      .single()

    if (!dbUser) {
      res.status(400).json({ error: 'No account found for invitation email. Please sign up first.' })
      return
    }

    const userId = dbUser.id

    const { data: existingMember } = await supabase
      .from('account_members')
      .select('user_id')
      .eq('account_id', invitation.account_id)
      .eq('user_id', userId)
      .single()

    if (!existingMember) {
      await supabase
        .from('account_members')
        .insert({ account_id: invitation.account_id, user_id: userId, role: 'member' })

      await supabase
        .from('users')
        .update({ account_id: invitation.account_id })
        .eq('id', userId)
    }

    await supabase
      .from('account_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)

    res.json({ message: 'Invitation accepted successfully' })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: err.errors })
      return
    }
    logger.error({ err }, 'Accept invitation error')
    res.status(500).json({ error: 'Failed to accept invitation' })
  }
})

export default router
