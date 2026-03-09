import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1).optional(),
  FINNHUB_API_KEY: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  parsed.error.errors.forEach((e) => {
    console.error(`  ${e.path.join('.')}: ${e.message}`)
  })
  process.exit(1)
}

export const env = parsed.data
