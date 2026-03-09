import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

// Verify the key role at startup
try {
  const payload = JSON.parse(Buffer.from(supabaseServiceKey.split('.')[1], 'base64').toString())
  const role = payload?.role
  if (role !== 'service_role') {
    console.error(`\n⚠️  SUPABASE_SERVICE_ROLE_KEY has role="${role}" — expected "service_role".\n   You are likely using the anon key. RLS will block all DB writes.\n   Fix: copy the "service_role" key from Supabase → Project Settings → API.\n`)
  } else {
    console.log('✓ Supabase service role key verified')
  }
} catch {
  console.warn('⚠️  Could not decode SUPABASE_SERVICE_ROLE_KEY — ensure it is a valid JWT')
}

// DB client — service role, session never modified (used for all table operations)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

// Auth client — separate instance used only for signUp/signIn flows so the
// db client's service-role context is never overwritten by a user session
export const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})
