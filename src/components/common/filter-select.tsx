"use client";

import * as React from "react";
import { ListFilter } from "lucide-react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelectProps {
  options: FilterOption[];
  paramName?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export default function FilterSelect({
  options,
  paramName = "status",
  defaultValue,
  placeholder = "Filter",
  className,
}: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentValue =
    searchParams.get(paramName) ??
    defaultValue ??
    options[0]?.value ??
    "";

  const selectedOption = options.find(
    (option) => option.value === currentValue
  );

  const handleChange = (value: string | null) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (value) {
      params.set(paramName, value);
    } else {
      params.delete(paramName);
    }

    // New filter = first page
    params.delete("page");

    const queryString = params.toString();

    router.push(
      queryString
        ? `${pathname}?${queryString}`
        : pathname
    );
  };

  return (
    <div className={className}>
      <Select
        value={currentValue}
        onValueChange={handleChange}
      >
        <SelectTrigger className="h-10 min-h-10 w-full rounded-lg px-3 sm:w-47.5">
          <ListFilter className="size-4 shrink-0 text-muted-foreground" />

          <SelectValue placeholder={placeholder}>
            {selectedOption?.label ?? placeholder}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}