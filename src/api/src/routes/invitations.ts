import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

const router = Router()

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
})

router.post('/accept', async (req: Request, res: Response): Promise<void> => {
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
