"use client";

import { useState, type ChangeEvent } from "react";
import {
  capitalizeWords,
  CUSTOMER_NOTES_PLACEHOLDER,
} from "@/lib/customer-notes";

/** Profile textarea that capitalizes the first letter of each word while typing. */
export function CustomerNotesField({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(() =>
    capitalizeWords(defaultValue ?? "")
  );

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const el = e.target;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = capitalizeWords(el.value);
    setValue(next);
    requestAnimationFrame(() => {
      el.setSelectionRange(start, end);
    });
  }

  return (
    <textarea
      id="customer_notes"
      name="customer_notes"
      rows={5}
      value={value}
      onChange={handleChange}
      placeholder={CUSTOMER_NOTES_PLACEHOLDER}
      className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400"
    />
  );
}
