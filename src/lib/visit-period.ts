export type PeriodGrain = "all" | "year" | "month" | "week" | "day";

export interface VisitPeriod {
  grain: PeriodGrain;
  year: number;
  month: number; // 1-12
  week: number; // 1-5 week of month
  day: number; // 1-31
}

export function defaultVisitPeriod(): VisitPeriod {
  return {
    grain: "all",
    year: 2026,
    month: 6,
    week: 1,
    day: 2,
  };
}

export function parseVisitPeriod(
  params: Record<string, string | string[] | undefined>
): VisitPeriod {
  const defaults = defaultVisitPeriod();
  const grainRaw = single(params.grain) ?? "all";
  const grain: PeriodGrain =
    grainRaw === "year" ||
    grainRaw === "month" ||
    grainRaw === "week" ||
    grainRaw === "day" ||
    grainRaw === "all"
      ? grainRaw
      : "all";

  return {
    grain,
    year: clampInt(single(params.year), 2024, 2030, defaults.year),
    month: clampInt(single(params.month), 1, 12, defaults.month),
    week: clampInt(single(params.week), 1, 5, defaults.week),
    day: clampInt(single(params.day), 1, 31, defaults.day),
  };
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clampInt(
  raw: string | undefined,
  min: number,
  max: number,
  fallback: number
) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function periodDateRange(
  period: VisitPeriod
): { start: string; end: string } | null {
  if (period.grain === "all") return null;

  const { year, month, week, day, grain } = period;
  const monthStr = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();

  if (grain === "year") {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }

  if (grain === "month") {
    return {
      start: `${year}-${monthStr}-01`,
      end: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  if (grain === "week") {
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, lastDay);
    return {
      start: `${year}-${monthStr}-${String(startDay).padStart(2, "0")}`,
      end: `${year}-${monthStr}-${String(endDay).padStart(2, "0")}`,
    };
  }

  const safeDay = Math.min(day, lastDay);
  const dayStr = String(safeDay).padStart(2, "0");
  return {
    start: `${year}-${monthStr}-${dayStr}`,
    end: `${year}-${monthStr}-${dayStr}`,
  };
}

export function dateInPeriod(dateStr: string, period: VisitPeriod) {
  const range = periodDateRange(period);
  if (!range) return true;
  return dateStr >= range.start && dateStr <= range.end;
}

export function periodLabel(period: VisitPeriod) {
  if (period.grain === "all") return "All time";
  const monthName = new Date(period.year, period.month - 1, 1).toLocaleString(
    "en-US",
    { month: "long" }
  );
  if (period.grain === "year") return String(period.year);
  if (period.grain === "month") return `${monthName} ${period.year}`;
  if (period.grain === "week") {
    return `Week ${period.week} of ${monthName} ${period.year}`;
  }
  return `${monthName} ${period.day}, ${period.year}`;
}

export type OrganizeMode = "company" | "jobs";
export type CompletedSortMode = "date" | "company" | "job";

export function parseOrganizeMode(
  params: Record<string, string | string[] | undefined>
): OrganizeMode {
  const raw = single(params.organize);
  // Accept legacy "tasks" query value
  return raw === "jobs" || raw === "tasks" ? "jobs" : "company";
}

export function parseCompletedSortMode(
  params: Record<string, string | string[] | undefined>
): CompletedSortMode {
  const raw = single(params.sort);
  if (raw === "company" || raw === "job" || raw === "date") return raw;
  return "date";
}

export function buildVisitsQuery(
  period: VisitPeriod,
  organize: OrganizeMode,
  extra?: Record<string, string | undefined>
) {
  const q = new URLSearchParams();
  q.set("grain", period.grain);
  q.set("year", String(period.year));
  q.set("month", String(period.month));
  q.set("week", String(period.week));
  q.set("day", String(period.day));
  q.set("organize", organize);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) q.set(key, value);
    }
  }
  return q.toString();
}

export function buildCompletedQuery(
  period: VisitPeriod,
  sort: CompletedSortMode
) {
  return buildVisitsQuery(period, "company", { sort });
}
