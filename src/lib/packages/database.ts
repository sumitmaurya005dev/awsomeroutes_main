import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Package tables are available after the package migration is pushed and types are regenerated.
export async function createPackageDatabaseClient(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}
