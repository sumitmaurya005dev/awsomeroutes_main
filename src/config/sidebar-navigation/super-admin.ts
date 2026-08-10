import type { SidebarItem } from "@/types/sidebar-navigation";


export const superAdminNavigation: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
    permission: "dashboard.view",
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
        href: "/dashboard/packages",
        icon: "list",
        permission: "packages.view",
      },

      {
        title: "Create Package",
        href: "/dashboard/packages/create",
        icon: "plus",
        permission: "packages.create",
      },
    ],
  },
   {
    title: "Countries",
    icon: "map",
    permission: "countries.view",

    children: [
      {
        title: "All Countries",
        href: "/dashboard/packages",
        icon: "list",
        permission: "countries.view",
      },

      {
        title: "Create Country",
        href: "/dashboard/packages/create",
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
        href: "/dashboard/packages",
        icon: "list",
        permission: "regions.view",
      },

      {
        title: "Create Region",
        href: "/dashboard/packages/create",
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
        href: "/dashboard/packages",
        icon: "list",
        permission: "destinations.view",
      },

      {
        title: "Create Location",
        href: "/dashboard/packages/create",
        icon: "plus",
        permission: "destinations.create",
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
        href: "/dashboard/packages",
        icon: "list",
        permission: "activities.view",
      },

      {
        title: "Create an Activity",
        href: "/dashboard/packages/create",
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
        href: "/dashboard/packages",
        icon: "list",
        permission: "hotels.view",
      },

      {
        title: "Add a Hotel",
        href: "/dashboard/packages/create",
        icon: "plus",
        permission: "hotels.create",
      },
    ],
  },

  {
    title: "Vehicles",
    icon: "car",
    permission: "vehicles.view",

    children: [
      {
        title: "All a Vehicle",
        href: "/dashboard/packages",
        icon: "list",
        permission: "vehicles.view",
      },

      {
        title: "Add a Hotel",
        href: "/dashboard/packages/create",
        icon: "plus",
        permission: "vehicles.create",
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
      href: "/dashboard/users",
      icon: "list",
      permission: "users.view",
    },

    {
      title: "Create User",
      href: "/dashboard/users/create",
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
      href: "/dashboard/roles",
      icon: "list",
      permission: "roles.view",
    },

    {
      title: "Create Role",
      href: "/dashboard/roles/create",
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
      href: "/dashboard/permissions",
      icon: "list",
      permission: "permissions.view",
    },
  ],
},
 
];


