import type { Tables } from "@/types/database.types";

export type Destination = Tables<"destinations">;
export type DestinationStatus = "active" | "inactive";

export type DestinationWithRegion = Destination & {
  region: { id: string; name: string; slug: string; country: { id: string; name: string } | null } | null;
};
