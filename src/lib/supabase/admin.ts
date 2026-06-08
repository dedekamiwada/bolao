import { createClient } from "@supabase/supabase-js"

// Service-role client — only use server-side in API routes or Edge Functions
// Untyped intentionally: manual Database types conflict with Supabase's strict generics.
// Replace with `supabase gen types` output once the project is stable.
export function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
