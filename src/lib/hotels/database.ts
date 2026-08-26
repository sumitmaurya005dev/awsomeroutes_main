import { createClient } from "@/lib/supabase/server";

export async function createHotelDatabaseClient() {
  return createClient();
}
