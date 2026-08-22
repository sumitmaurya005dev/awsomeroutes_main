// config/permissions.ts
// Purpose: Role Based Access Control (RBAC).
export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: "dashboard.view",
  },

  PACKAGES: {
    VIEW: "packages.view",
    CREATE: "packages.create",
    UPDATE: "packages.update",
    DELETE: "packages.delete",
  },

  DESTINATIONS: {
    VIEW: "destinations.view",
    CREATE: "destinations.create",
    UPDATE: "destinations.update",
    DELETE: "destinations.delete",
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
  },

  HOTELS: {
    VIEW: "hotels.view",
    CREATE: "hotels.create",
    UPDATE: "hotels.update",
    DELETE: "hotels.delete",
  },

  VEHICLES: {
    VIEW: "vehicles.view",
    CREATE: "vehicles.create",
    UPDATE: "vehicles.update",
    DELETE: "vehicles.delete",
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

  SETTINGS: {
    MANAGE: "settings.manage",
  },
} as const;
