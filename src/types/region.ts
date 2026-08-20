export type RegionStatus =
  | "active"
  | "inactive"
  
export interface Region {
  id: string;
  country_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;

  country: {
    id: string;
    name: string;
  } | null;
}