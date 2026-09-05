import type { SidebarItem } from "@/types/sidebar-navigation";

export const superAdminNavigation: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
    permission: "dashboard.view",
  },
  {
    title: "Custom Itineraries",
    icon: "clipboard",
    permission: "custom_itineraries.view",
    children: [
      { title: "All Itineraries", href: "/home/custom-itineraries", icon: "list", permission: "custom_itineraries.view" },
      { title: "Create Itinerary", href: "/home/custom-itineraries/create", icon: "plus", permission: "custom_itineraries.create" },
    ],
  },

  // Later implementation
  //  {
  //   title: "Bookings",
  //   icon: "clipboard",
  //   permission: "packages.view",

  //   children: [
  //     {
  //       title: "All Bookings",
  //       href: "/dashboard/packages",
  //       icon: "list",
  //       permission: "bookings.view",
  //     },

  //     {
  //       title: "New Booking",
  //       href: "/dashboard/packages/create",
  //       icon: "plus",
  //       permission: "bookings.create",
  //     },
  //   ],
  // },

  {
    title: "Packages",
    icon: "package",
    permission: "packages.view",

    children: [
      {
        title: "All Packages",
        href: "/home/packages",
        icon: "list",
        permission: "packages.view",
      },

      {
        title: "Create Package",
        href: "/home/packages/create",
        icon: "plus",
        permission: "packages.create",
      },
      {
        title: "Content Defaults",
        href: "/home/packages/content-defaults",
        icon: "file",
        permission: "packages.manage_defaults",
      },
    ],
  },
  {
    title: "Countries",
    icon: "globe",
    permission: "countries.view",

    children: [
      {
        title: "All Countries",
        href: "/home/countries",
        icon: "list",
        permission: "countries.view",
      },

      {
        title: "Create Country",
        href: "/home/countries/create",
        icon: "plus",
        permission: "countries.create",
      },
    ],
  },

  {
    title: "Regions",
    icon: "map",
    permission: "regions.view",

    children: [
      {
        title: "All Regions",
        href: "/home/regions",
        icon: "list",
        permission: "regions.view",
      },

      {
        title: "Create Region",
        href: "/home/regions/create",
        icon: "plus",
        permission: "regions.create",
      },
    ],
  },

  {
    title: "Destinations",
    icon: "pin",
    permission: "destinations.view",

    children: [
      {
        title: "All Destinations",
        href: "/home/destinations",
        icon: "list",
        permission: "destinations.view",
      },

      {
        title: "Create Destination",
        href: "/home/destinations/create",
        icon: "plus",
        permission: "destinations.create",
      },
    ],
  },

  {
    title: "Locations",
    icon: "pin",
    permission: "locations.view",

    children: [
      {
        title: "All Locations",
        href: "/home/locations",
        icon: "list",
        permission: "locations.view",
      },
      {
        title: "Create Location",
        href: "/home/locations/create",
        icon: "plus",
        permission: "locations.create",
      },
    ],
  },

  {
    title: "Activities",
    icon: "activity",
    permission: "activities.view",

    children: [
      {
        title: "All Activities",
        href: "/home/activities",
        icon: "list",
        permission: "activities.view",
      },

      {
        title: "Create Activity",
        href: "/home/activities/create",
        icon: "plus",
        permission: "activities.create",
      },
    ],
  },

  {
    title: "Hotels",
    icon: "hotel",
    permission: "hotels.view",

    children: [
      {
        title: "All Hotels",
        href: "/home/hotels",
        icon: "list",
        permission: "hotels.view",
      },

      {
        title: "Add a Hotel",
        href: "/home/hotels/create",
        icon: "plus",
        permission: "hotels.create",
      },
      {
        title: "Location Pricing",
        href: "/home/hotels/pricing",
        icon: "list",
        permission: "hotels.manage_pricing",
      },
    ],
  },

  {
    title: "Vehicles",
    icon: "car",
    permission: "vehicles.view",

    children: [
      {
        title: "Vehicle Management",
        href: "/home/vehicles",
        icon: "list",
        permission: "vehicles.view",
      },
    ],
  },

  {
    title: "User Management",
    icon: "users",
    permission: "users.view",

    children: [
      {
        title: "All Users",
        href: "/home/users",
        icon: "list",
        permission: "users.view",
      },

      {
        title: "Create User",
        href: "/home/users/create",
        icon: "plus",
        permission: "users.create",
      },
    ],
  },

  {
    title: "Role Management",
    icon: "shield",
    permission: "roles.view",

    children: [
      {
        title: "All Roles",
        href: "/home/roles",
        icon: "list",
        permission: "roles.view",
      },

      {
        title: "Create Role",
        href: "/home/roles/create",
        icon: "plus",
        permission: "roles.create",
      },
    ],
  },

  {
    title: "Permission Management",
    icon: "key",
    permission: "permissions.view",

    children: [
      {
        title: "Permission Matrix",
        href: "/home/permissions",
        icon: "list",
        permission: "permissions.view",
      },
      {
        title: "Create Permission",
        href: "/home/permissions/create",
        icon: "plus",
        permission: "permissions.create",
      },
    ],
  },
];
