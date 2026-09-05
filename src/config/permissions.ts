// config/permissions.ts
// Purpose: Role Based Access Control (RBAC).
export const PERMISSIONS = {
  CUSTOM_ITINERARIES: {
    VIEW: "custom_itineraries.view",
    CREATE: "custom_itineraries.create",
    UPDATE: "custom_itineraries.update",
    DELETE: "custom_itineraries.delete",
    MANAGE_PRICING: "custom_itineraries.manage_pricing",
    FINALIZE: "custom_itineraries.finalize",
    EXPORT: "custom_itineraries.export",
  },
  DASHBOARD: {
    VIEW: "dashboard.view",
  },

  PACKAGES: {
    VIEW: "packages.view",
    CREATE: "packages.create",
    UPDATE: "packages.update",
    DELETE: "packages.delete",
    MANAGE_PRICING: "packages.manage_pricing",
    MANAGE_DEFAULTS: "packages.manage_defaults",
    PUBLISH: "packages.publish",
  },

  DESTINATIONS: {
    VIEW: "destinations.view",
    CREATE: "destinations.create",
    UPDATE: "destinations.update",
    DELETE: "destinations.delete",
  },

  COUNTRIES: {
    VIEW: "countries.view",
    CREATE: "countries.create",
    UPDATE: "countries.update",
    DELETE: "countries.delete",
  },

  REGIONS: {
    VIEW: "regions.view",
    CREATE: "regions.create",
    UPDATE: "regions.update",
    DELETE: "regions.delete",
  },

  LOCATIONS: {
    VIEW: "locations.view",
    CREATE: "locations.create",
    UPDATE: "locations.update",
    DELETE: "locations.delete",
  },

  ACTIVITIES: {
    VIEW: "activities.view",
    CREATE: "activities.create",
    UPDATE: "activities.update",
    DELETE: "activities.delete",
    MANAGE_PRICING: "activities.manage_pricing",
    OVERRIDE_PRICE: "activities.override_price",
  },

  HOTELS: {
    VIEW: "hotels.view",
    CREATE: "hotels.create",
    UPDATE: "hotels.update",
    DELETE: "hotels.delete",
    MANAGE_PRICING: "hotels.manage_pricing",
    OVERRIDE_PRICE: "hotels.override_price",
  },

  VEHICLES: {
    VIEW: "vehicles.view",
    CREATE: "vehicles.create",
    UPDATE: "vehicles.update",
    DELETE: "vehicles.delete",
    MANAGE_PRICING: "vehicles.manage_pricing",
    ASSIGN: "vehicles.assign",
  },

  BOOKINGS: {
    VIEW: "bookings.view",
    UPDATE: "bookings.update",
  },

  USERS: {
    VIEW: "users.view",
    CREATE: "users.create",
    UPDATE: "users.update",
    DELETE: "users.delete",
  },

  ROLES: {
    VIEW: "roles.view",
    CREATE: "roles.create",
    UPDATE: "roles.update",
    DELETE: "roles.delete",
  },

  PERMISSIONS: {
    VIEW: "permissions.view",
    CREATE: "permissions.create",
    UPDATE: "permissions.update",
    DELETE: "permissions.delete",
  },

  MEDIA: {
    VIEW: "media.view",
    CREATE: "media.create",
    UPDATE: "media.update",
    DELETE: "media.delete",
  },

  SETTINGS: {
    MANAGE: "settings.manage",
  },
} as const;

type ValueOf<T> = T[keyof T];
export type PermissionKey = ValueOf<{
  [Group in keyof typeof PERMISSIONS]: ValueOf<(typeof PERMISSIONS)[Group]>;
}>;
