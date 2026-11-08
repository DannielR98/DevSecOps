/* import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
 */

import { createClient } from "@supabase/supabase-js";

const isE2E = import.meta.env.MODE === "e2e";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || (isE2E ? "http://127.0.0.1:54321" : "");

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || (isE2E ? "bdd-test-anon-key" : "");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
