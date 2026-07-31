import {
  LayoutDashboard,
  BriefcaseBusiness,
  CalendarCheck2,
  FileText,
  Shield,
  Settings,
  Package,
  MapPinned,
  Bike,
  Hotel,
  ClipboardList,
  Users,
  Images,
  MessageSquareQuote,
} from "lucide-react"

import { ROUTES } from "../routes"

export const adminNavigation = [
  {
    group: "Main",

    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        icon: LayoutDashboard,
        href: ROUTES.DASHBOARD.HOME,
      },
    ],
  },

  {
    group: "Travel Management",

    items: [
      {
        id: "travel",
        title: "Travel Management",
        icon: BriefcaseBusiness,

        children: [
          {
            id: "packages",
            title: "Packages",
            icon: Package,
            href: ROUTES.TRAVEL.PACKAGES,
          },
          {
            id: "destinations",
            title: "Destinations",
            icon: MapPinned,
            href: ROUTES.TRAVEL.DESTINATIONS,
          },
          {
            id: "activities",
            title: "Activities",
            icon: ClipboardList,
            href: ROUTES.TRAVEL.ACTIVITIES,
          },
          {
            id: "hotels",
            title: "Hotels",
            icon: Hotel,
            href: ROUTES.TRAVEL.HOTELS,
          },
          {
            id: "vehicles",
            title: "Vehicles",
            icon: Bike,
            href: ROUTES.TRAVEL.VEHICLES,
          },
        ],
      },
    ],
  },

  {
    group: "Bookings",

    items: [
      {
        id: "booking-management",
        title: "Booking Management",
        icon: CalendarCheck2,

        children: [
          {
            id: "inquiries",
            title: "Inquiries",
            href: ROUTES.BOOKINGS.INQUIRIES,
          },
          {
            id: "bookings",
            title: "Bookings",
            href: ROUTES.BOOKINGS.BOOKINGS,
          },
          {
            id: "customers",
            title: "Customers",
            href: ROUTES.BOOKINGS.CUSTOMERS,
          },
        ],
      },
    ],
  },

  {
    group: "Content",

    items: [
      {
        id: "content",
        title: "Content Management",
        icon: FileText,

        children: [
          {
            id: "blogs",
            title: "Blogs",
            icon: FileText,
            href: ROUTES.CONTENT.BLOGS,
          },
          {
            id: "gallery",
            title: "Gallery",
            icon: Images,
            href: ROUTES.CONTENT.GALLERY,
          },
          {
            id: "testimonials",
            title: "Testimonials",
            icon: MessageSquareQuote,
            href: ROUTES.CONTENT.TESTIMONIALS,
          },
        ],
      },
    ],
  },

  {
    group: "Administration",

    items: [
      {
        id: "administration",
        title: "Administration",
        icon: Shield,

        children: [
          {
            id: "users",
            title: "Users",
            icon: Users,
            href: ROUTES.USERS.USERS,
          },
        ],
      },
    ],
  },

  {
    group: "System",

    items: [
      {
        id: "settings",
        title: "Settings",
        icon: Settings,
        href: ROUTES.SETTINGS.GENERAL,
      },
    ],
  },
]