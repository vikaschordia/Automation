"use client";

import { ChevronDownIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

/**
 * Checkbox-list dropdown for "pick any number of these" filters — the multi-value counterpart to
 * `Select` (src/components/ui/select.tsx), built from the same Popover/Checkbox primitives since
 * there's no combobox/cmdk component in the project to reach for instead. `value: []` means "no
 * restriction" (same as `Select`'s "all" sentinel), mirrored by every filter that uses this.
 */
export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = "All",
  className,
  disabled,
}: {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const label =
    value.length === 0 ? placeholder : value.length === 1 ? (options.find((o) => o.value === value[0])?.label ?? placeholder) : `${value.length} selected`;

  function toggle(optionValue: string) {
    onValueChange(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
            value.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <span className="line-clamp-1">{label}</span>
          <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-56 overflow-y-auto p-1.5">
        {value.length > 0 && (
          <button
            type="button"
            className="mb-1 w-full rounded-md px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => onValueChange([])}
          >
            Clear selection
          </button>
        )}
        {options.length === 0 && <p className="px-1.5 py-1 text-xs text-muted-foreground">No options</p>}
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Checkbox checked={value.includes(option.value)} onCheckedChange={() => toggle(option.value)} />
            <span className="line-clamp-1">{option.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
