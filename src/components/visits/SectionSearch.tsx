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
    <label className="mt-3 block text-sm text-stone-600">
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
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
