import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error("Missing required Supabase environment variables.");
}

export const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
export const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);