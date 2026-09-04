"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__physical_io_empty__";

export type FormSelectOption = {
  value: string;
  label: string;
};

type FormSelectProps = {
  options: FormSelectOption[];
  name?: string;
  id?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  onValueChange?: (value: string) => void;
};

function normalize(value: string | undefined) {
  return value === "" ? EMPTY_VALUE : value;
}

function denormalize(value: string | undefined) {
  return value === EMPTY_VALUE ? "" : value ?? "";
}

/**
 * shadcn Select adapted for native form submissions. Radix reserves an empty
 * item value, so the component maps it internally while preserving an empty
 * string in FormData for server actions.
 */
export function FormSelect({
  options,
  name,
  id,
  className,
  value,
  defaultValue,
  placeholder,
  disabled,
  required,
  onValueChange,
  "aria-label": ariaLabel,
}: FormSelectProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(normalize(defaultValue));
  const selectedValue = controlled ? normalize(value) : internalValue;

  useEffect(() => {
    if (!controlled) setInternalValue(normalize(defaultValue));
  }, [controlled, defaultValue]);

  function handleValueChange(next: string) {
    if (!controlled) setInternalValue(next);
    onValueChange?.(denormalize(next));
  }

  return (
    <>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={denormalize(selectedValue)}
          disabled={disabled}
          required={required}
        />
      ) : null}
      <Select
        value={selectedValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger id={id} aria-label={ariaLabel} className={cn("w-full", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value || EMPTY_VALUE} value={normalize(option.value) ?? EMPTY_VALUE}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
