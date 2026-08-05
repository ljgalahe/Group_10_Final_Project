"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  ExtraWorkItem,
  ScheduleJob,
  VisitWorkState,
} from "@/components/crew-lead/schedule-types";
import {
  addFieldException,
  loadDailyRoster,
  loadFieldExceptions,
  loadVisitWorkStateForStatus,
  saveVisitWorkState,
  type CrewMember,
} from "@/components/crew-lead/crewLeadStorage";
import type {
  FieldExceptionReport,
  FieldExceptionType,
} from "@/components/crew-lead/schedule-types";
import {
  equipmentForServices,
  formatStatusLabel,
  materialsForServices,
  tasksForServices,
} from "@/components/crew-lead/visitWorkDefaults";
import { CrewSiteNotes } from "@/components/crew-lead/CrewSiteNotes";

const EXTRA_STATUSES = [
  { value: "needed", label: "Needed" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
] as const;

export function VisitWorkPanel({
  job,
  contractExtraWork,
}: {
  job: ScheduleJob;
  contractExtraWork: ExtraWorkItem[];
}) {
  const materials = useMemo(
    () => materialsForServices(job.services),
    [job.services]
  );
  const equipment = useMemo(
    () => equipmentForServices(job.services),
    [job.services]
  );
  const tasks = useMemo(() => tasksForServices(job.services), [job.services]);

  const [state, setState] = useState<VisitWorkState>(() =>
    loadVisitWorkStateForStatus(
      job.id,
      job.status,
      tasksForServices(job.services).map((task) => task.id),
      false
    )
  );
  const [roster, setRoster] = useState<CrewMember[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeHours, setEmployeeHours] = useState("");
  const [extraDescription, setExtraDescription] = useState("");
  const [extraStatus, setExtraStatus] =
    useState<(typeof EXTRA_STATUSES)[number]["value"]>("pending_approval");
  const [assignId, setAssignId] = useState("");
  const [exceptionType, setExceptionType] =
    useState<FieldExceptionType>("could_not_access");
  const [exceptionDetails, setExceptionDetails] = useState("");
  const [exceptionMessage, setExceptionMessage] = useState("");
  const [visitExceptions, setVisitExceptions] = useState<
    FieldExceptionReport[]
  >([]);

  useEffect(() => {
    setState(
      loadVisitWorkStateForStatus(
        job.id,
        job.status,
        tasks.map((task) => task.id),
        contractExtraWork.length > 0
      )
    );
    setRoster(loadDailyRoster());
    setVisitExceptions(
      loadFieldExceptions().filter((report) => report.jobId === job.id)
    );
  }, [job.id, job.status, tasks, contractExtraWork.length]);

  const isScheduled = job.status === "scheduled";
  const isCompleted = job.status === "completed";
  const canEditCrew = isScheduled;

  function update(next: VisitWorkState) {
    if (!canEditCrew) return;
    setState(next);
    saveVisitWorkState(job.id, next);
  }

  function addEmployee(e: FormEvent) {
    e.preventDefault();
    if (!canEditCrew) return;
    const name = employeeName.trim();
    const hours = Number(employeeHours);
    if (!name || Number.isNaN(hours) || hours < 0) return;
    update({
      ...state,
      employees: [
        ...state.employees,
        { id: crypto.randomUUID(), name, hours },
      ],
    });
    setEmployeeName("");
    setEmployeeHours("");
  }

  function removeEmployee(id: string) {
    if (!canEditCrew) return;
    update({
      ...state,
      employees: state.employees.filter((row) => row.id !== id),
    });
  }

  function toggleTask(taskId: string) {
    if (!canEditCrew) return;
    const completed = state.completedTaskIds.includes(taskId)
      ? state.completedTaskIds.filter((id) => id !== taskId)
      : [...state.completedTaskIds, taskId];
    update({ ...state, completedTaskIds: completed });
  }

  function addExtraWork(e: FormEvent) {
    e.preventDefault();
    if (!canEditCrew) return;
    const description = extraDescription.trim();
    if (!description) return;
    update({
      ...state,
      extraWorkNotes: [
        ...state.extraWorkNotes,
        {
          id: crypto.randomUUID(),
          description,
          status: extraStatus,
        },
      ],
    });
    setExtraDescription("");
    setExtraStatus("pending_approval");
  }

  function updateExtraStatus(
    id: string,
    status: (typeof EXTRA_STATUSES)[number]["value"]
  ) {
    if (!canEditCrew) return;
    update({
      ...state,
      extraWorkNotes: state.extraWorkNotes.map((note) =>
        note.id === id ? { ...note, status } : note
      ),
    });
  }

  function assignEmployee(e: FormEvent) {
    e.preventDefault();
    if (!canEditCrew) return;
    const member = roster.find((row) => row.id === assignId);
    if (!member) return;
    if (state.assignedEmployees.some((row) => row.id === member.id)) return;
    update({
      ...state,
      assignedEmployees: [...state.assignedEmployees, member],
    });
    setAssignId("");
  }

  function unassignEmployee(id: string) {
    if (!canEditCrew) return;
    update({
      ...state,
      assignedEmployees: state.assignedEmployees.filter((row) => row.id !== id),
    });
  }

  const totalHours = state.employees.reduce((sum, row) => sum + row.hours, 0);
  const availableToAssign = roster.filter(
    (member) => !state.assignedEmployees.some((row) => row.id === member.id)
  );

  const plannedHours = state.plannedHours || 4;
  const clockedHours =
    state.jobStartedAt && state.jobEndedAt
      ? Math.max(
          0,
          (new Date(state.jobEndedAt).getTime() -
            new Date(state.jobStartedAt).getTime()) /
            (1000 * 60 * 60)
        )
      : null;

  function formatClock(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function startJob() {
    if (!canEditCrew) return;
    update({
      ...state,
      jobStartedAt: new Date().toISOString(),
      jobEndedAt: null,
    });
  }

  function endJob() {
    if (!canEditCrew || !state.jobStartedAt) return;
    update({
      ...state,
      jobEndedAt: new Date().toISOString(),
    });
  }

  function submitException(e: FormEvent) {
    e.preventDefault();
    if (!canEditCrew || !exceptionDetails.trim()) return;
    const report = addFieldException({
      jobId: job.id,
      customerName: job.customerName,
      address: job.address,
      type: exceptionType,
      details: exceptionDetails.trim(),
    });
    setVisitExceptions((prev) => [report, ...prev]);
    setExceptionDetails("");
    setExceptionMessage("Exception sent to management.");
    window.setTimeout(() => setExceptionMessage(""), 3000);
  }

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-green-950">
          {isCompleted ? "Employees Who Worked" : "Assigned Employees"}
        </h4>
        {state.assignedEmployees.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {state.assignedEmployees.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  {member.name}
                  <span className="text-stone-500"> · {member.role}</span>
                </span>
                {canEditCrew ? (
                  <button
                    type="button"
                    onClick={() => unassignEmployee(member.id)}
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    Unassign
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-stone-500">
            {isCompleted
              ? "No employees were recorded for this visit."
              : "No employees assigned to this visit yet."}
          </p>
        )}
        {canEditCrew && availableToAssign.length > 0 ? (
          <form
            onSubmit={assignEmployee}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <select
              value={assignId}
              onChange={(e) => setAssignId(e.target.value)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Assign from today&apos;s crew...</option>
              {availableToAssign.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Assign
            </button>
          </form>
        ) : null}
        {!canEditCrew && !isCompleted ? (
          <p className="mt-2 text-xs text-stone-500">
            Employees can only be assigned on scheduled visits.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-green-950">
            Materials
          </h4>
          <ul className="mt-2 list-inside list-disc text-sm text-stone-700">
            {materials.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-green-950">
            Equipment
          </h4>
          <ul className="mt-2 list-inside list-disc text-sm text-stone-700">
            {equipment.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-green-950">
            Labor
          </h4>
          <span className="text-xs text-stone-500">
            Logged: {totalHours.toFixed(1)} hrs
            {isCompleted ? " (view only)" : ""}
          </span>
        </div>

        <div className="mt-3 rounded-md border border-stone-200 bg-white p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Time Clock vs Planned
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-xs text-stone-500">Planned</p>
              <p className="font-semibold text-green-950">
                {plannedHours.toFixed(1)} hrs
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Start</p>
              <p className="font-semibold text-green-950">
                {formatClock(state.jobStartedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">End</p>
              <p className="font-semibold text-green-950">
                {formatClock(state.jobEndedAt)}
              </p>
            </div>
          </div>
          {clockedHours != null ? (
            <p className="mt-2 text-xs text-stone-600">
              Actual clocked:{" "}
              <span className="font-semibold">{clockedHours.toFixed(2)} hrs</span>
              {" · "}
              Variance:{" "}
              <span
                className={`font-semibold ${
                  clockedHours - plannedHours > 0.25
                    ? "text-amber-800"
                    : "text-green-800"
                }`}
              >
                {clockedHours - plannedHours >= 0 ? "+" : ""}
                {(clockedHours - plannedHours).toFixed(2)} hrs
              </span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-stone-500">
              Start the job clock when the crew begins work.
            </p>
          )}
          {canEditCrew ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startJob}
                className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                {state.jobStartedAt ? "Restart Clock" : "Start Job"}
              </button>
              <button
                type="button"
                onClick={endJob}
                disabled={!state.jobStartedAt}
                className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                End Job
              </button>
            </div>
          ) : null}
        </div>

        {state.employees.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {state.employees.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  {row.name} — {row.hours} hr{row.hours === 1 ? "" : "s"}
                </span>
                {canEditCrew ? (
                  <button
                    type="button"
                    onClick={() => removeEmployee(row.id)}
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-stone-500">
            {isCompleted
              ? "No labor hours were recorded for this visit."
              : "No labor hours recorded yet for this job."}
          </p>
        )}
        {canEditCrew ? (
          <form
            onSubmit={addEmployee}
            className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_auto]"
          >
            <input
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Employee Name"
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.25"
              value={employeeHours}
              onChange={(e) => setEmployeeHours(e.target.value)}
              placeholder="Hours"
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Add
            </button>
          </form>
        ) : null}
      </div>

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-green-950">
          Tasks
        </h4>
        <ul className="mt-2 space-y-2">
          {tasks.map((task) => {
            const checked = state.completedTaskIds.includes(task.id);
            return (
              <li key={task.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-800">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canEditCrew}
                    onChange={() => toggleTask(task.id)}
                    className="mt-0.5"
                  />
                  <span className={checked ? "text-stone-400 line-through" : ""}>
                    {task.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-green-950">
          Extra Work
        </h4>

        {contractExtraWork.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {contractExtraWork.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-stone-200 bg-white p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-green-950">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-stone-600">{item.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-stone-500">
                      Quote ${Number(item.quotedAmount).toFixed(2)}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    {isCompleted ? "Approved" : formatStatusLabel(item.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-stone-500">
            No management extra-work orders on this contract yet.
          </p>
        )}

        {state.extraWorkNotes.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {state.extraWorkNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"
              >
                <p className="text-stone-800">{note.description}</p>
                {canEditCrew ? (
                  <label className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                    Status
                    <select
                      value={note.status}
                      onChange={(e) =>
                        updateExtraStatus(
                          note.id,
                          e.target.value as (typeof EXTRA_STATUSES)[number]["value"]
                        )
                      }
                      className="rounded border border-stone-300 bg-white px-2 py-1"
                    >
                      {EXTRA_STATUSES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="mt-2 text-xs text-stone-500">
                    Status: {formatStatusLabel(note.status)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {canEditCrew ? (
          <form onSubmit={addExtraWork} className="mt-3 space-y-2">
            <textarea
              value={extraDescription}
              onChange={(e) => setExtraDescription(e.target.value)}
              placeholder="Describe extra work needed or completed..."
              rows={2}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={extraStatus}
                onChange={(e) =>
                  setExtraStatus(
                    e.target.value as (typeof EXTRA_STATUSES)[number]["value"]
                  )
                }
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                {EXTRA_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Log Extra Work
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-green-950">
          Exception Report
        </h4>

        {visitExceptions.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {visitExceptions.map((report) => (
              <li
                key={report.id}
                className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-amber-950">
                    {formatStatusLabel(report.type)}
                  </p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                    {isCompleted ? "Completed" : "Sent to Manager"}
                  </span>
                </div>
                <p className="mt-1 text-stone-700">{report.details}</p>
                <p className="mt-1 text-[11px] text-stone-500">
                  {new Date(report.submittedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : isCompleted ? (
          <p className="mt-2 text-sm text-stone-500">
            No exception reports were submitted for this visit.
          </p>
        ) : null}

        {canEditCrew ? (
          <form onSubmit={submitException} className="mt-3 space-y-2">
            <select
              value={exceptionType}
              onChange={(e) =>
                setExceptionType(e.target.value as FieldExceptionType)
              }
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="could_not_access">Could Not Access Site</option>
              <option value="dog_loose">Dog Loose / Unsafe Animal</option>
              <option value="equipment_failure">Equipment Failure</option>
              <option value="other">Other</option>
            </select>
            <textarea
              value={exceptionDetails}
              onChange={(e) => setExceptionDetails(e.target.value)}
              placeholder="Describe what happened and what you need from management..."
              rows={2}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              Send to Manager
            </button>
            {exceptionMessage ? (
              <p className="text-sm text-green-800">{exceptionMessage}</p>
            ) : null}
          </form>
        ) : null}
      </div>

      <CrewSiteNotes
        customerId={job.customerId}
        jobId={job.id}
        status={job.status}
      />
    </div>
  );
}
