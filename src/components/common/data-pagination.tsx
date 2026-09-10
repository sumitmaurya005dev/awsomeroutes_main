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
