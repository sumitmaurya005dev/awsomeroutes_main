import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database.types";

export type Country = Tables<"countries">;

export type CountryInsert = TablesInsert<"countries">;

export type CountryUpdate = TablesUpdate<"countries">;

export type CountryStatus = Country["status"];