"use client";

export function SectionSearch({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search this section",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="gs-index-field mt-0 block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  );
}

export function matchesJobSearch(
  job: {
    companyName: string;
    jobLabel: string;
    location: string;
    status: string;
    date: string;
    crew: { name: string; role: string }[];
    weather?: { label?: string; detail?: string } | null;
  },
  query: string
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const parts = [
    job.companyName,
    job.jobLabel,
    job.location,
    job.status,
    job.date,
    job.weather?.label ?? "",
    job.weather?.detail ?? "",
    ...job.crew.flatMap((m) => [m.name, m.role]),
  ];
  return parts.join(" ").toLowerCase().includes(q);
}
