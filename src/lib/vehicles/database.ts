import { createClient } from "@/lib/supabase/server";

export async function createVehicleDatabaseClient() {
  return createClient();
}
