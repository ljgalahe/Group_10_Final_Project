import { Card } from "@/components/ui";
import type { ScheduleJob } from "@/components/crew-lead/schedule-types";
import { addDays } from "@/components/crew-lead/dateHelpers";

function formatShort(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Dashboard card previewing tomorrow's crew stops. */
export function CrewLeadTomorrowPreview({
  jobs,
  today,
}: {
  jobs: ScheduleJob[];
  today: string;
}) {
  const tomorrow = addDays(today, 1);
  const stops = jobs.filter(
    (job) => job.scheduledDate === tomorrow && job.status !== "cancelled"
  );

  return (
    <Card className="border-green-800/20 bg-stone-50">
      <h3 className="text-base font-semibold text-green-950">
        Tomorrow Preview
      </h3>
      <p className="mt-1 text-sm text-stone-500">
        Prep for {formatShort(tomorrow)}
      </p>
      <p className="mt-3 gs-metric-value text-3xl text-green-900">
        {stops.length} stop{stops.length === 1 ? "" : "s"}
      </p>
      {stops.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">
          No jobs on the calendar for tomorrow yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {stops.slice(0, 4).map((job) => (
            <li
              key={job.id}
              className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <p className="font-medium text-green-950">{job.customerName}</p>
              <p className="text-xs text-stone-500">
                {job.services.slice(0, 3).join(", ") || "General Maintenance"}
              </p>
            </li>
          ))}
          {stops.length > 4 ? (
            <li className="text-xs text-stone-500">
              +{stops.length - 4} more on Schedule
            </li>
          ) : null}
        </ul>
      )}
      <a
        href="/schedule"
        className="mt-3 inline-block text-sm font-semibold text-green-800 hover:underline"
      >
        Open full schedule →
      </a>
    </Card>
  );
}
