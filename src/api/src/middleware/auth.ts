import { Response, NextFunction } from 'express'
import { supabase, supabaseAuth } from '../lib/supabase'
import { AuthenticatedRequest } from '../types'
import { logger } from '../lib/logger'

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token)
    if (error || !data.user) {
      logger.warn({ error: error?.message }, 'requireAuth: getUser failed')
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, account_id')
      .eq('id', data.user.id)
      .single()

    if (userError || !userData) {
      logger.warn({ userId: data.user.id, userError: userError?.message }, 'requireAuth: user not found in public.users')
      res.status(401).json({ error: 'User not found' })
      return
    }

    let role: 'owner' | 'member' = 'member'
    if (userData.account_id) {
      const { data: account } = await supabase
        .from('accounts')
        .select('owner_id')
        .eq('id', userData.account_id)
        .single()
      if (account?.owner_id === userData.id) role = 'owner'
    }

    req.user = {
      id: userData.id,
      email: userData.email,
      accountId: userData.account_id,
      role,
    }

    next()
  } catch (err) {
    logger.error({ err }, 'Auth middleware error')
    res.status(401).json({ error: 'Authentication failed' })
  }
}

export function requireOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'owner') {
    res.status(403).json({ error: 'Only account owners can perform this action' })
    return
  }
  next()
}
