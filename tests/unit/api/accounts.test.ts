import { describe, it, expect } from 'vitest'

// Account members/invitations logic tests

type InvitationStatus = 'pending' | 'accepted' | 'expired'
type MemberRole = 'owner' | 'member'

interface Invitation {
  id: string
  email: string
  status: InvitationStatus
  expires_at: Date
}

interface Member {
  user_id: string
  role: MemberRole
  account_id: string
}

function canInvite(existingInvitations: Invitation[], email: string): { ok: boolean; reason?: string } {
  const pending = existingInvitations.find(
    (inv) => inv.email === email && inv.status === 'pending'
  )
  if (pending) return { ok: false, reason: 'Pending invitation already exists for this email' }
  return { ok: true }
}

function canRemoveMember(actorRole: MemberRole, targetUserId: string, actorUserId: string, ownerId: string): { ok: boolean; reason?: string } {
  if (actorRole !== 'owner') return { ok: false, reason: 'Only account owners can remove members' }
  if (targetUserId === ownerId) return { ok: false, reason: 'Cannot remove the account owner' }
  return { ok: true }
}

function isInvitationValid(invitation: Invitation): { valid: boolean; reason?: string } {
  if (invitation.status !== 'pending') return { valid: false, reason: 'Invitation is no longer pending' }
  if (invitation.expires_at < new Date()) return { valid: false, reason: 'Invitation has expired' }
  return { valid: true }
}

describe('invitation logic', () => {
  it('allows invite when no existing pending invitation', () => {
    const result = canInvite([], 'user@example.com')
    expect(result.ok).toBe(true)
  })

  it('blocks invite when pending invitation exists for same email', () => {
    const existingInv: Invitation = {
      id: '1',
      email: 'user@example.com',
      status: 'pending',
      expires_at: new Date(Date.now() + 86400000),
    }
    const result = canInvite([existingInv], 'user@example.com')
    expect(result.ok).toBe(false)
  })

  it('allows invite if previous invitation was accepted', () => {
    const existingInv: Invitation = {
      id: '1',
      email: 'user@example.com',
      status: 'accepted',
      expires_at: new Date(Date.now() + 86400000),
    }
    const result = canInvite([existingInv], 'user@example.com')
    expect(result.ok).toBe(true)
  })
})

describe('invitation validity', () => {
  it('marks expired invitation as invalid', () => {
    const inv: Invitation = {
      id: '1',
      email: 'test@example.com',
      status: 'pending',
      expires_at: new Date(Date.now() - 1000),
    }
    const result = isInvitationValid(inv)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('expired')
  })

  it('marks accepted invitation as invalid', () => {
    const inv: Invitation = {
      id: '1',
      email: 'test@example.com',
      status: 'accepted',
      expires_at: new Date(Date.now() + 86400000),
    }
    const result = isInvitationValid(inv)
    expect(result.valid).toBe(false)
  })

  it('marks valid pending non-expired invitation as valid', () => {
    const inv: Invitation = {
      id: '1',
      email: 'test@example.com',
      status: 'pending',
      expires_at: new Date(Date.now() + 86400000),
    }
    const result = isInvitationValid(inv)
    expect(result.valid).toBe(true)
  })
})

describe('member removal logic', () => {
  const ownerId = 'owner-123'

  it('allows owner to remove a member', () => {
    const result = canRemoveMember('owner', 'member-456', ownerId, ownerId)
    expect(result.ok).toBe(true)
  })

  it('blocks non-owner from removing member', () => {
    const result = canRemoveMember('member', 'member-456', 'member-111', ownerId)
    expect(result.ok).toBe(false)
  })

  it('blocks owner from removing themselves', () => {
    const result = canRemoveMember('owner', ownerId, ownerId, ownerId)
    expect(result.ok).toBe(false)
  })
})
