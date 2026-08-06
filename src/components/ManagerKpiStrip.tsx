import Link from "next/link";

export type ManagerKpi = {
  id: string;
  label: string;
  value: string;
  hint: string;
  href?: string;
};

export function ManagerKpiStrip({ kpis }: { kpis: ManagerKpi[] }) {
  return (
    <section aria-label="Manager key metrics">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const className =
            "flex h-full flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-green-300 hover:bg-green-50/40";
          const body = (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {kpi.label}
              </p>
              <p className="gs-metric-value mt-2 text-2xl leading-none text-green-900">
                {kpi.value}
              </p>
              <p className="mt-2 text-xs leading-snug text-stone-500">
                {kpi.hint}
              </p>
            </>
          );

          if (kpi.href) {
            return (
              <Link key={kpi.id} href={kpi.href} className={className}>
                {body}
              </Link>
            );
          }

          return (
            <div key={kpi.id} className={className}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
