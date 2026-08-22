import type { Tables } from "@/types/database.types";

export type Location = Tables<"locations">;
export type LocationStatus = "active" | "inactive";
export type LocationWithDestination = Location & {
  destination: { id: string; name: string; slug: string; region: { id: string; name: string } | null } | null;
};
