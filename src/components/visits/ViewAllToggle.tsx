"use client";

export function ViewAllToggle({
  viewAll,
  onToggle,
  count,
}: {
  viewAll: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-xs font-medium text-green-800 hover:underline"
    >
      {viewAll
        ? "Show less"
        : count != null
          ? `View all (${count})`
          : "View all"}
    </button>
  );
}

export function scrollBoxClass(viewAll: boolean, maxClass: string) {
  return viewAll
    ? "space-y-3 pr-1"
    : `${maxClass} space-y-3 overflow-y-auto pr-2`;
}
