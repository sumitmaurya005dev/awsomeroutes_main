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
