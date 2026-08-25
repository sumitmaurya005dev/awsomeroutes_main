export const MEDIA_FOLDERS = {
  COUNTRIES: "/awesomeroutes/countries",
  REGIONS: "/awesomeroutes/regions",
  DESTINATIONS: "/awesomeroutes/destinations",
  LOCATIONS: "/awesomeroutes/locations",
  HOTELS: "/awesomeroutes/hotels",
  ACTIVITIES: "/awesomeroutes/activities",
  PACKAGES: "/awesomeroutes/packages",
  PROFILES: "/awesomeroutes/profiles",
} as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[keyof typeof MEDIA_FOLDERS];

export const MEDIA_LIBRARY_FOLDERS = new Set<MediaFolder>([
  MEDIA_FOLDERS.COUNTRIES,
  MEDIA_FOLDERS.REGIONS,
  MEDIA_FOLDERS.DESTINATIONS,
  MEDIA_FOLDERS.LOCATIONS,
  MEDIA_FOLDERS.HOTELS,
  MEDIA_FOLDERS.ACTIVITIES,
  MEDIA_FOLDERS.PACKAGES,
]);

export function isMediaLibraryFolder(value: string): value is MediaFolder {
  return MEDIA_LIBRARY_FOLDERS.has(value as MediaFolder);
}
