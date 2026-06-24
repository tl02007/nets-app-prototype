import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

// Supabase anon keys are JWTs — they always start with "eyJ"
// A key in sb_publishable_... format is a different credential type and will be rejected
const isValidJwt = SUPABASE_ANON_KEY.startsWith("eyJ")

export const hasSupabaseCredentials = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && isValidJwt)

if (SUPABASE_ANON_KEY && !isValidJwt) {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a JWT (must start with 'eyJ').\n" +
    "  Go to: https://supabase.com/dashboard/project/_/settings/api\n" +
    "  Copy the 'anon public' key and update NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n" +
    "  Supabase DB is DISABLED until this is fixed — app will use local fallback data."
  )
}

export const supabase = hasSupabaseCredentials
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        storage: {
          getItem: async () => null,
          setItem: async () => {},
          removeItem: async () => {},
        },
      },
    })
  : null
