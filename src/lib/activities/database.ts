import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Remove this compatibility adapter after regenerating database.types.ts once
// the activity migration has been applied to Supabase.
export async function createActivityDatabaseClient(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}
