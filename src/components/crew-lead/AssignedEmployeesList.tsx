"use client";

import { useEffect, useState } from "react";
import {
  getAssignedEmployeesForJob,
  loadVisitWorkState,
  loadVisitWorkStateForStatus,
  type CrewMember,
} from "@/components/crew-lead/crewLeadStorage";
import type { CrewEmployeeHours } from "@/components/crew-lead/schedule-types";
import { tasksForServices } from "@/components/crew-lead/visitWorkDefaults";

/** Shows employees assigned to a visit (Schedule / Visits cards). */
export function AssignedEmployeesList({
  jobId,
  status,
  services = [],
}: {
  jobId: string;
  status?: string;
  services?: string[];
}) {
  const [assigned, setAssigned] = useState<CrewMember[]>([]);
  const [labor, setLabor] = useState<CrewEmployeeHours[]>([]);
  const isCompleted = status === "completed";

  useEffect(() => {
    if (isCompleted) {
      const taskIds = tasksForServices(services).map((task) => task.id);
      const completed = loadVisitWorkStateForStatus(
        jobId,
        "completed",
        taskIds,
        false
      );
      setAssigned(completed.assignedEmployees);
      setLabor(completed.employees);
      return;
    }

    setAssigned(getAssignedEmployeesForJob(jobId));
    const work = loadVisitWorkState(jobId);
    setLabor(work.employees ?? []);
  }, [jobId, isCompleted, services]);

  if (isCompleted) {
    if (labor.length === 0 && assigned.length === 0) {
      return (
        <p className="mt-1 text-xs text-stone-500">
          No employee hours recorded for this completed visit.
        </p>
      );
    }

    const lines =
      labor.length > 0
        ? labor.map(
            (row) =>
              `${row.name} (${row.hours} hr${row.hours === 1 ? "" : "s"})`
          )
        : assigned.map((member) => member.name);

    return (
      <div className="mt-1 text-xs text-stone-600">
        <p>
          <span className="font-semibold text-stone-800">
            Employees Who Worked:
          </span>{" "}
          {lines.join(", ")}
        </p>
        <p className="mt-0.5 text-stone-500">View only — completed visit</p>
      </div>
    );
  }

  if (assigned.length === 0) {
    return (
      <p className="mt-1 text-xs text-stone-500">No employees assigned yet.</p>
    );
  }

  return (
    <p className="mt-1 text-xs text-stone-600">
      <span className="font-semibold text-stone-800">Assigned Employees:</span>{" "}
      {assigned.map((member) => member.name).join(", ")}
    </p>
  );
}
