import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { fetchCustomerSeasonalForecast } from "@/lib/queries";
import type { SeasonalForecastItem } from "@/lib/seasonal-forecast";

function phaseLabel(phase: SeasonalForecastItem["phase"]) {
  switch (phase) {
    case "spring":
      return "Spring";
    case "summer":
      return "Summer";
    case "fall":
      return "Fall";
    case "winter":
      return "Winter";
    case "renewal":
      return "Renewal";
  }
}

function forecastDotClass(
  status: SeasonalForecastItem["status"],
  phase: SeasonalForecastItem["phase"]
) {
  if (status === "past") return "bg-stone-300";
  if (status === "current") return "bg-green-700 ring-4 ring-green-100";
  if (phase === "renewal") return "bg-amber-600";
  return "bg-green-500";
}

export default async function WhatsComingUpPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (role !== "customer") {
    redirect("/dashboard");
  }

  const customerId = await getViewCustomerId();
  if (!customerId) {
    redirect("/dashboard");
  }

  const { data: seasonalForecast } =
    await fetchCustomerSeasonalForecast(customerId);

  return (
    <AppShell>
      <PageHeader
        title="What's Coming Up"
        description="Your landscape year as a season—spring cleanup through fall leaf removal—not just the next crew visit."
      />

      {seasonalForecast.length === 0 ? (
        <EmptyState message="No seasonal milestones are available yet. Active contracts will appear here as a forward-looking service calendar." />
      ) : (
        <Card className="max-w-3xl">
          <ol className="relative space-y-0 border-l border-stone-200 ml-2">
            {seasonalForecast.map((item) => {
              const isPast = item.status === "past";
              return (
                <li key={item.id} className="relative pl-8 pb-8 last:pb-0">
                  <span
                    className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${forecastDotClass(item.status, item.phase)}`}
                    aria-hidden
                  />
                  <div className={isPast ? "opacity-55" : undefined}>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                        {item.whenLabel}
                      </p>
                      <span className="text-stone-300">·</span>
                      <p className="text-xs text-stone-400">
                        {phaseLabel(item.phase)}
                        {item.status === "current" ? " · Now" : ""}
                      </p>
                    </div>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        item.status === "current"
                          ? "text-green-900"
                          : "text-green-950"
                      }`}
                    >
                      {item.headline}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">{item.detail}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {item.contractTitle}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </AppShell>
  );
}
