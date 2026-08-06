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
      <div className="gs-kpi-grid">
        {kpis.map((kpi) => {
          const className =
            "gs-kpi-tile flex h-full min-w-0 flex-col transition hover:border-green-700 hover:bg-green-50/50";
          const body = (
            <>
              <p className="gs-kpi-label">{kpi.label}</p>
              <p
                className="gs-metric-value gs-kpi-value text-green-900"
                title={kpi.value}
              >
                {kpi.value}
              </p>
              <p className="gs-kpi-hint">{kpi.hint}</p>
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
