type DatabaseError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  constraint?: string | null;
};

const dependencyMessages: Record<string, string> = {
  regions_country_id_fkey:
    "This country cannot be deleted because one or more regions are linked to it. Reassign or delete those regions first, or mark the country inactive.",
  destinations_region_id_fkey:
    "This region cannot be deleted because one or more destinations are linked to it. Reassign or delete those destinations first, or mark the region inactive.",
  locations_destination_id_fkey:
    "This destination cannot be deleted because one or more locations are linked to it. Reassign or delete those locations first, or mark the destination inactive.",
  locations_parent_location_id_fkey:
    "This location cannot be deleted because one or more child locations are linked to it. Reassign or delete those child locations first, or mark the location inactive.",
  activity_offerings_location_id_fkey:
    "This location cannot be deleted because one or more activity offerings use it. Reassign or remove those offerings first, or mark the location inactive.",
  hotels_location_id_fkey:
    "This location cannot be deleted because one or more hotels use it. Reassign those hotels first, or mark the location inactive.",
  hotel_rate_cards_location_id_fkey:
    "This location cannot be deleted because hotel pricing is configured for it. Remove or reassign those hotel rate cards first, or mark the location inactive.",
  transport_vendors_base_location_id_fkey:
    "This location cannot be deleted because one or more transport vendors use it as their base. Reassign those vendors first, or mark the location inactive.",
  vehicle_rate_cards_base_location_id_fkey:
    "This location cannot be deleted because vehicle pricing is configured for it. Remove or reassign those vehicle rate cards first, or mark the location inactive.",
  packages_start_location_id_fkey:
    "This location cannot be deleted because it is the starting point of one or more packages. Change those package routes first, or mark the location inactive.",
  packages_end_location_id_fkey:
    "This location cannot be deleted because it is the ending point of one or more packages. Change those package routes first, or mark the location inactive.",
  package_itinerary_days_start_location_id_fkey:
    "This location cannot be deleted because an itinerary day starts here. Change the linked package itinerary first, or mark the location inactive.",
  package_itinerary_days_end_location_id_fkey:
    "This location cannot be deleted because an itinerary day ends here. Change the linked package itinerary first, or mark the location inactive.",
  package_itinerary_days_overnight_location_id_fkey:
    "This location cannot be deleted because it is an overnight stop in a package itinerary. Change the linked itinerary first, or mark the location inactive.",
  package_vehicle_options_base_location_id_fkey:
    "This location cannot be deleted because a package vehicle rule uses it as the base. Change the linked vehicle rule first, or mark the location inactive.",
  activity_media_media_asset_id_fkey:
    "This media asset cannot be deleted because it is used in an activity gallery. Remove it from the activity first.",
};

export function getDeleteDependencyMessage(
  error: DatabaseError,
  fallback: string,
) {
  if (error.code !== "23503") return fallback;

  const errorText = [error.constraint, error.message, error.details]
    .filter(Boolean)
    .join(" ");

  for (const [constraint, message] of Object.entries(dependencyMessages)) {
    if (errorText.includes(constraint)) return message;
  }

  return "This record cannot be deleted because other records depend on it. Remove or reassign the linked records first, or mark this record inactive.";
}
