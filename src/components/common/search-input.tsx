"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
  className?: string;
}

export default function SearchInput({
  placeholder = "Search...",
  paramName = "search",
  className,
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlSearch = searchParams.get(paramName) ?? "";

  const [value, setValue] = React.useState(urlSearch);

  // Keep debounce timer in a ref
  const timerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  /*
   * Update URL
   */
  const updateSearch = React.useCallback(
    (searchValue: string) => {
      const params = new URLSearchParams(
        searchParams.toString()
      );

      const trimmedValue = searchValue.trim();

      if (trimmedValue) {
        params.set(paramName, trimmedValue);
      } else {
        params.delete(paramName);
      }

      // New search always starts from page 1
      params.delete("page");

      const queryString = params.toString();

      router.replace(
        queryString
          ? `${pathname}?${queryString}`
          : pathname
      );
    },
    [
      searchParams,
      paramName,
      pathname,
      router,
    ]
  );

  /*
   * Search while typing
   *
   * 300ms debounce means:
   * user types normally -> wait 300ms
   * before updating the URL/database query.
   */
  React.useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Nothing changed
    if (value === urlSearch) {
      return;
    }

    timerRef.current = setTimeout(() => {
      updateSearch(value);
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, urlSearch, updateSearch]);

  /*
   * Clear search
   */
  const handleClear = () => {
    // IMPORTANT:
    // Cancel any pending search request
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Immediately clear input
    setValue("");

    // Immediately remove search from URL
    updateSearch("");
  };

  return (
    <div className={className}>
      <div className="relative">
        {/* Search Icon */}
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        {/* Input */}
        <Input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          placeholder={placeholder}
          className="h-10 rounded-lg pl-9 pr-9"
        />

        {/* Clear Button */}
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-md"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}