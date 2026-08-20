// "use client";

// import * as React from "react";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";
// import { ChevronLeft, ChevronRight } from "lucide-react";

// interface DataPaginationProps {
//   page: number;
//   totalPages: number;
//   count: number;
//   limit: number;
// }

// export function DataPagination({
//   page,
//   totalPages,
//   count,
//   limit,
// }: DataPaginationProps) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const searchParams = useSearchParams();

//   // --------------------------------------------------
//   // Safe pagination values
//   // --------------------------------------------------

//   const safeTotalPages = Math.max(totalPages, 1);

//   const start =
//     count === 0
//       ? 0
//       : (page - 1) * limit + 1;

//   const end = Math.min(page * limit, count);

//   const canGoPrevious = page > 1;
//   const canGoNext = page < safeTotalPages;

//   // --------------------------------------------------
//   // Navigate to page
//   // --------------------------------------------------

//   function goToPage(nextPage: number) {
//     const params = new URLSearchParams(
//       searchParams.toString()
//     );

//     params.set("page", String(nextPage));

//     router.push(
//       `${pathname}?${params.toString()}`
//     );
//   }

//   return (
//     <div
//       className="
//         flex
//         flex-col
//         gap-4
//         rounded-xl
//         border
//         border-border
//         bg-card
//         px-4
//         py-3
//         shadow-sm
//         sm:flex-row
//         sm:items-center
//         sm:justify-between
//       "
//     >
//       {/* ================================================== */}
//       {/* Results Information */}
//       {/* ================================================== */}

//       <p className="text-sm text-muted-foreground">
//         Showing{" "}
//         <span className="font-semibold text-foreground">
//           {start}
//         </span>

//         <span className="mx-1 text-muted-foreground/60">
//           –
//         </span>

//         <span className="font-semibold text-foreground">
//           {end}
//         </span>{" "}

//         of{" "}

//         <span className="font-semibold text-foreground">
//           {count}
//         </span>
//       </p>

//       {/* ================================================== */}
//       {/* Pagination Controls */}
//       {/* ================================================== */}

//       <div
//         className="
//           flex
//           items-center
//           justify-between
//           gap-2
//           sm:justify-end
//         "
//       >
//         {/* ================================================== */}
//         {/* Previous */}
//         {/* ================================================== */}

//         <button
//           type="button"
//           onClick={() =>
//             goToPage(page - 1)
//           }
//           disabled={!canGoPrevious}
//           aria-label="Previous page"
//           className="
//             inline-flex
//             h-9
//             items-center
//             justify-center
//             gap-1.5
//             rounded-lg
//             border
//             border-border
//             bg-background
//             px-3
//             text-sm
//             font-medium
//             text-foreground
//             shadow-sm
//             transition-all
//             duration-200

//             hover:border-primary
//             hover:bg-primary
//             hover:text-primary-foreground

//             focus-visible:outline-none
//             focus-visible:ring-2
//             focus-visible:ring-primary/30

//             disabled:cursor-not-allowed
//             disabled:opacity-40

//             disabled:hover:border-border
//             disabled:hover:bg-background
//             disabled:hover:text-foreground
//           "
//         >
//           <ChevronLeft className="h-4 w-4" />

//           <span className="hidden sm:inline">
//             Previous
//           </span>
//         </button>

//         {/* ================================================== */}
//         {/* Page Indicator */}
//         {/* ================================================== */}

//         <div
//           className="
//             flex
//             h-9
//             min-w-25
//             items-center
//             justify-center
//             rounded-lg
//             border
//             border-primary/15
//             bg-primary/5
//             px-3
//             text-sm
//             font-medium
//             text-muted-foreground
//           "
//         >
//           <span className="text-foreground">
//             Page
//           </span>

//           <span className="mx-1.5 font-semibold text-primary">
//             {page}
//           </span>

//           <span className="text-muted-foreground/60">
//             /
//           </span>

//           <span className="ml-1.5 font-semibold text-foreground">
//             {safeTotalPages}
//           </span>
//         </div>

//         {/* ================================================== */}
//         {/* Next */}
//         {/* ================================================== */}

//         <button
//           type="button"
//           onClick={() =>
//             goToPage(page + 1)
//           }
//           disabled={!canGoNext}
//           aria-label="Next page"
//           className="
//             inline-flex
//             h-9
//             items-center
//             justify-center
//             gap-1.5
//             rounded-lg
//             border
//             border-border
//             bg-background
//             px-3
//             text-sm
//             font-medium
//             text-foreground
//             shadow-sm
//             transition-all
//             duration-200

//             hover:border-primary
//             hover:bg-primary
//             hover:text-primary-foreground

//             focus-visible:outline-none
//             focus-visible:ring-2
//             focus-visible:ring-primary/30

//             disabled:cursor-not-allowed
//             disabled:opacity-40

//             disabled:hover:border-border
//             disabled:hover:bg-background
//             disabled:hover:text-foreground
//           "
//         >
//           <span className="hidden sm:inline">
//             Next
//           </span>

//           <ChevronRight className="h-4 w-4" />
//         </button>
//       </div>
//     </div>
//   );
// }




// ----------------------------------new Code here----------------------------

"use client";

import * as React from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface DataPaginationProps {
  page: number;
  totalPages: number;
  count: number;
  limit: number;
}

export function DataPagination({
  page,
  totalPages,
  count,
  limit,
}: DataPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safePage = Math.max(1, page);
  const safeTotalPages = Math.max(1, totalPages);
  const safeCount = Math.max(0, count);
  const safeLimit = Math.max(1, limit);

  const start =
    safeCount === 0
      ? 0
      : (safePage - 1) * safeLimit + 1;

  const end =
    safeCount === 0
      ? 0
      : Math.min(safePage * safeLimit, safeCount);

  const canGoPrevious = safePage > 1;
  const canGoNext = safePage < safeTotalPages;

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > safeTotalPages) {
      return;
    }

    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set("page", String(nextPage));

    router.push(
      `${pathname}?${params.toString()}`
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        "rounded-xl border border-border",
        "bg-card px-4 py-3",
        "shadow-sm",
        "transition-shadow duration-200",
        "hover:shadow-md",
        "sm:flex-row sm:items-center sm:justify-between"
      )}
    >
      {/* Information */}

      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {start}
        </span>
        {"–"}
        <span className="font-medium text-foreground">
          {end}
        </span>{" "}
        of{" "}
        <span className="font-medium text-foreground">
          {safeCount}
        </span>
      </p>

      {/* Controls */}

      <div
        className={cn(
          "flex items-center justify-between gap-2",
          "sm:justify-end"
        )}
      >
        {/* Previous */}

        <button
          type="button"
          onClick={() =>
            goToPage(safePage - 1)
          }
          disabled={!canGoPrevious}
          aria-label="Previous page"
          className={cn(
            "inline-flex h-9 items-center justify-center",
            "gap-1.5 rounded-lg",
            "border border-primary/20",
            "bg-primary text-primary-foreground",
            "px-3",
            "font-medium",
            "shadow-sm",
            "transition-all duration-200",

            "hover:bg-primary/90",
            "hover:shadow-md",
            "active:scale-95",

            "disabled:pointer-events-none",
            "disabled:cursor-not-allowed",
            "disabled:opacity-40"
          )}
        >
          <ChevronLeft className="h-4 w-4" />

          <span className="hidden sm:inline">
            Previous
          </span>
        </button>

        {/* Page Indicator */}

        <div
          className={cn(
            "flex h-9 min-w-25 items-center justify-center",
            "rounded-lg",
            "border border-primary/15",
            "bg-primary/5",
            "px-3",
            "text-sm text-muted-foreground"
          )}
        >
          Page{" "}
          <span className="mx-1 font-semibold text-primary">
            {safePage}
          </span>{" "}
          of{" "}
          <span className="ml-1 font-semibold text-foreground">
            {safeTotalPages}
          </span>
        </div>

        {/* Next */}

        <button
          type="button"
          onClick={() =>
            goToPage(safePage + 1)
          }
          disabled={!canGoNext}
          aria-label="Next page"
          className={cn(
            "inline-flex h-9 items-center justify-center",
            "gap-1.5 rounded-lg",
            "border border-primary/20",
            "bg-primary text-primary-foreground",
            "px-3",
            "font-medium",
            "shadow-sm",
            "transition-all duration-200",

            "hover:bg-primary/90",
            "hover:shadow-md",
            "active:scale-95",

            "disabled:pointer-events-none",
            "disabled:cursor-not-allowed",
            "disabled:opacity-40"
          )}
        >
          <span className="hidden sm:inline">
            Next
          </span>

          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}