import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

let supabase: ReturnType<typeof createSupabaseClient<Database>> | undefined

export function createClient() {
  if (supabase) return supabase
  supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return supabase
}
