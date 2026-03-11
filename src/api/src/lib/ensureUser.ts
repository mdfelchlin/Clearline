import { supabase } from './supabase'

/**
 * Ensures a row exists in public.users (and an account) for the given auth user.
 * Used for sign-up, Google OAuth, and magic link so the first request after auth succeeds.
 */
export async function ensureUserAndAccount(userId: string, email: string) {
  const { data: existingById } = await supabase
    .from('users')
    .select('id, account_id')
    .eq('id', userId)
    .single()

  if (existingById) return existingById

  const { data: existingByEmail } = await supabase
    .from('users')
    .select('id, account_id')
    .eq('email', email)
    .single()

  if (existingByEmail) {
    await supabase.from('account_members').delete().eq('user_id', existingByEmail.id)
    await supabase.from('users').delete().eq('id', existingByEmail.id)
  }

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({ id: userId, email })
    .select('id, account_id')
    .single()

  if (userError || !newUser) {
    throw new Error(`Failed to create user: ${userError?.message}`)
  }

  const { data: newAccount, error: accountError } = await supabase
    .from('accounts')
    .insert({ owner_id: userId })
    .select('id')
    .single()

  if (accountError || !newAccount) {
    throw new Error(`Failed to create account: ${accountError?.message}`)
  }

  await supabase.from('users').update({ account_id: newAccount.id }).eq('id', userId)
  await supabase.from('account_members').insert({ account_id: newAccount.id, user_id: userId, role: 'owner' })

  return { id: userId, account_id: newAccount.id }
}
