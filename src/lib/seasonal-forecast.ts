/**
 * Seasonal landscape rhythm for the customer portal.
 * Built from contract windows + included services (not raw visit lists).
 */

export type SeasonPhase =
  | "spring"
  | "summer"
  | "fall"
  | "winter"
  | "renewal";

export type SeasonalForecastItem = {
  id: string;
  sortDate: string;
  whenLabel: string;
  headline: string;
  detail: string;
  phase: SeasonPhase;
  status: "past" | "current" | "upcoming";
  contractTitle: string;
};

type ContractInput = {
  id: string;
  title: string;
  season_start: string;
  season_end: string;
  visits_per_week: number | null;
  notes: string | null;
  contract_services?:
    | { service_name: string; included: boolean }[]
    | null;
};

function parseDate(iso: string) {
  return new Date(iso + "T00:00:00");
}

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday on or before the given date (week-of label anchor). */
function weekOf(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function formatWeekOf(d: Date) {
  return `Week of ${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shortContractTitle(title: string) {
  return title.replace(/^20\d{2}\s+/, "").trim() || title;
}

function serviceNames(contract: ContractInput) {
  return (contract.contract_services ?? [])
    .filter((s) => s.included)
    .map((s) => s.service_name.toLowerCase());
}

function hasService(names: string[], ...needles: string[]) {
  return names.some((n) => needles.some((needle) => n.includes(needle)));
}

function statusFor(
  start: Date,
  end: Date,
  today: Date
): "past" | "current" | "upcoming" {
  const t = today.getTime();
  if (t < start.getTime()) return "upcoming";
  if (t > end.getTime()) return "past";
  return "current";
}

function pushItem(
  items: SeasonalForecastItem[],
  partial: Omit<SeasonalForecastItem, "status">,
  today: Date,
  /** Inclusive span used for current/past/upcoming; defaults to sortDate day. */
  spanEnd?: Date
) {
  const start = parseDate(partial.sortDate);
  const end = spanEnd ?? start;
  items.push({
    ...partial,
    status: statusFor(start, end, today),
  });
}

function buildForContract(
  contract: ContractInput,
  today: Date
): SeasonalForecastItem[] {
  const items: SeasonalForecastItem[] = [];
  const names = serviceNames(contract);
  const start = parseDate(contract.season_start);
  const end = parseDate(contract.season_end);
  const title = shortContractTitle(contract.title);
  const year = start.getFullYear();
  const vpw = contract.visits_per_week ?? 1;

  const springCleanup = weekOf(start);
  const earlySummer = weekOf(new Date(year, 4, 18)); // mid-May
  const peakSummerStart = new Date(year, 5, 1); // June
  const peakSummerEnd = new Date(year, 7, 15); // mid-Aug
  const lateSummer = weekOf(new Date(year, 7, 24)); // late Aug
  const leafWeek = weekOf(new Date(year, 9, 6)); // week of Oct 6
  const lateFall = weekOf(new Date(year, 10, 10)); // mid-Nov
  const winterPrep = weekOf(new Date(year, 10, 24));

  // Keep anchors inside (or just after) the contract window when possible
  const clampToSeason = (d: Date) => {
    if (d < start) return new Date(start);
    if (d > end) return new Date(end);
    return d;
  };

  // ── Spring ────────────────────────────────────────────────────────────
  if (
    hasService(names, "spring", "cleanup") ||
    /grounds|landscape|hoa|industrial/i.test(title)
  ) {
    const d = clampToSeason(springCleanup);
    pushItem(
      items,
      {
        id: `${contract.id}-spring`,
        sortDate: toIso(d),
        whenLabel: formatWeekOf(d),
        headline: "Spring cleanup kicks off the season",
        detail: `Beds, debris, and edge cleanup on ${title} as we open the ${year} season.`,
        phase: "spring",
        contractTitle: title,
      },
      today,
      new Date(d.getTime() + 13 * 86400000)
    );
  }

  // ── Peak summer maintenance ───────────────────────────────────────────
  if (hasService(names, "mow", "edging", "trimming", "island")) {
    const s = clampToSeason(peakSummerStart);
    const e = clampToSeason(peakSummerEnd);
    if (s <= e) {
      pushItem(
        items,
        {
          id: `${contract.id}-summer-mow`,
          sortDate: toIso(s),
          whenLabel: `${s.toLocaleDateString("en-US", { month: "short" })}–${e.toLocaleDateString("en-US", { month: "short" })}`,
          headline:
            vpw >= 2
              ? "Peak summer mowing — full rhythm"
              : "Regular summer mowing continues",
          detail: `${vpw} visit${vpw === 1 ? "" : "s"} per week on ${title}. Edging and trimming follow the heat-of-season schedule.`,
          phase: "summer",
          contractTitle: title,
        },
        today,
        e
      );
    }
  }

  if (hasService(names, "irrigation", "watering", "controller")) {
    const s = clampToSeason(earlySummer);
    const e = clampToSeason(lateSummer);
    pushItem(
      items,
      {
        id: `${contract.id}-irrigation-summer`,
        sortDate: toIso(s),
        whenLabel: `${formatMonthYear(s).split(" ")[0]} through mid-season`,
        headline: "Irrigation on summer schedule",
        detail: `System checks, head adjustments, and watering updates for ${title} while turf is thirstiest.`,
        phase: "summer",
        contractTitle: title,
      },
      today,
      e
    );

    if (end >= leafWeek) {
      const d = clampToSeason(leafWeek);
      pushItem(
        items,
        {
          id: `${contract.id}-irrigation-cutback`,
          sortDate: toIso(d),
          whenLabel: formatWeekOf(d),
          headline: "Fall irrigation cutback",
          detail:
            "Controllers step down for cooler nights—less water, same plant health focus.",
          phase: "fall",
          contractTitle: title,
        },
        today
      );
    }
  }

  if (hasService(names, "fertil", "bed weed", "weeding", "mulch")) {
    const d = clampToSeason(lateSummer);
    pushItem(
      items,
      {
        id: `${contract.id}-late-summer-beds`,
        sortDate: toIso(d),
        whenLabel: formatWeekOf(d),
        headline: "Late-summer bed care",
        detail: `Weeding, bed edges, and touch-ups on ${title} before fall color work.`,
        phase: "summer",
        contractTitle: title,
      },
      today
    );
  }

  // ── Fall services ─────────────────────────────────────────────────────
  const wantsLeaf =
    hasService(names, "leaf", "fall") ||
    (contract.notes ?? "").toLowerCase().includes("leaf") ||
    (contract.notes ?? "").toLowerCase().includes("fall") ||
    hasService(names, "mow");

  if (wantsLeaf && end.getMonth() >= 7) {
    // Prefer iconic "week of Oct 6" when the contract still runs that late;
    // otherwise close-out leaf pass just before season_end.
    let leafDate = leafWeek;
    if (leafWeek > end) {
      leafDate = weekOf(new Date(end.getTime() - 7 * 86400000));
      if (leafDate < start) leafDate = weekOf(end);
    }
    const d = clampToSeason(leafDate);
    const isClosingPass = leafWeek > end;
    pushItem(
      items,
      {
        id: `${contract.id}-fall-cleanup`,
        sortDate: toIso(d),
        whenLabel: formatWeekOf(d),
        headline: isClosingPass
          ? "Fall cleanup wraps the season"
          : "Fall cleanup begins",
        detail: isClosingPass
          ? `Leaf removal and final grounds pass on ${title} before the contract season ends.`
          : `Leaf removal and season wrap-up on ${title}—the shift from weekly mowing to autumn cleanup.`,
        phase: "fall",
        contractTitle: title,
      },
      today,
      new Date(d.getTime() + 20 * 86400000)
    );
  }

  if (hasService(names, "island", "parking") || /island|parking/i.test(title)) {
    if (end >= lateFall) {
      const d = clampToSeason(lateFall);
      pushItem(
        items,
        {
          id: `${contract.id}-fall-islands`,
          sortDate: toIso(d),
          whenLabel: formatWeekOf(d),
          headline: "Parking island fall refresh",
          detail:
            "Shrub beds and tree rings get a final tidy before cooler weather sets in.",
          phase: "fall",
          contractTitle: title,
        },
        today
      );
    }
  }

  // ── Season close / winter ─────────────────────────────────────────────
  if (hasService(names, "irrigation", "controller") && end.getMonth() >= 9) {
    const d = clampToSeason(
      end < winterPrep ? weekOf(end) : winterPrep
    );
    pushItem(
      items,
      {
        id: `${contract.id}-winterize`,
        sortDate: toIso(d),
        whenLabel: formatWeekOf(d),
        headline: "Irrigation season close-out",
        detail: `Final controller review and winter prep for ${title}.`,
        phase: "winter",
        contractTitle: title,
      },
      today
    );
  }

  // ── Renewal ───────────────────────────────────────────────────────────
  const renewWindowStart = new Date(end);
  renewWindowStart.setDate(renewWindowStart.getDate() - 90);
  // Only surface renewal storytelling when we're in the look-ahead window
  if (today >= renewWindowStart) {
    pushItem(
      items,
      {
        id: `${contract.id}-renewal`,
        sortDate: toIso(end),
        whenLabel: formatMonthYear(end),
        headline: `Your contract renews in ${end.toLocaleDateString("en-US", { month: "long" })}`,
        detail: `Here's what next season looks like: same service rhythm on ${title}, refreshed dates, and a chance to add work (color, mulch, hardscape) before spring.`,
        phase: "renewal",
        contractTitle: title,
      },
      today,
      end
    );
    const renewItem = items.find((i) => i.id === `${contract.id}-renewal`);
    const within45 = new Date(end);
    within45.setDate(within45.getDate() - 45);
    if (renewItem && today >= within45 && today <= end) {
      renewItem.status = "current";
    } else if (renewItem && today < within45) {
      renewItem.status = "upcoming";
    }
  }

  return items;
}

/**
 * Forward-looking seasonal milestones for a customer's active contracts.
 * Shows current + upcoming (and a light recent-past for context).
 */
export function buildSeasonalForecast(
  contracts: ContractInput[],
  today = new Date()
): SeasonalForecastItem[] {
  const todayMid = new Date(today);
  todayMid.setHours(0, 0, 0, 0);

  const all = contracts.flatMap((c) => buildForContract(c, todayMid));
  const sorted = all.sort((a, b) => {
    if (a.sortDate !== b.sortDate) return a.sortDate.localeCompare(b.sortDate);
    return a.headline.localeCompare(b.headline);
  });

  const upcoming = sorted.filter((i) => i.status !== "past");
  const recentPast = sorted.filter((i) => i.status === "past").slice(-1);

  // Prefer a clean forward story
  const combined = [...recentPast, ...upcoming];
  return combined.slice(0, 8);
}
