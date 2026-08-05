"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CrewSiteNotes } from "@/components/crew-lead/CrewSiteNotes";
import {
  addFieldException,
  loadDailyRoster,
  loadVisitWorkStateForStatus,
  saveVisitWorkState,
  type CrewMember,
} from "@/components/crew-lead/crewLeadStorage";
import type {
  ExtraWorkItem,
  FieldExceptionType,
  ScheduleJob,
  VisitWorkState,
} from "@/components/crew-lead/schedule-types";
import {
  equipmentForServices,
  formatStatusLabel,
  materialsForServices,
  tasksForServices,
} from "@/components/crew-lead/visitWorkDefaults";

const EXTRA_STATUSES = [
  { value: "needed", label: "Needed" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
] as const;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-green-950">{title}</h4>
      {hint ? <p className="mt-0.5 text-xs text-stone-500">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function VisitWorkPanel({
  job,
  contractExtraWork,
  variant = "full",
}: {
  job: ScheduleJob;
  contractExtraWork: ExtraWorkItem[];
  /** Planning: crew, hours, tasks, supplies, and hourly extra work. Full: includes exceptions / richer extras. */
  variant?: "full" | "planning";
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
  const [laborEmployeeId, setLaborEmployeeId] = useState("");
  const [employeeHours, setEmployeeHours] = useState("");
  const [extraDescription, setExtraDescription] = useState("");
  const [extraHours, setExtraHours] = useState("");
  const [extraStatus, setExtraStatus] =
    useState<(typeof EXTRA_STATUSES)[number]["value"]>("pending_approval");
  const [assignId, setAssignId] = useState("");
  const [exceptionType, setExceptionType] =
    useState<FieldExceptionType>("could_not_access");
  const [exceptionDetails, setExceptionDetails] = useState("");
  const [exceptionMessage, setExceptionMessage] = useState("");
  const [showMore, setShowMore] = useState(false);

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
    setShowMore(false);
  }, [job.id, job.status, tasks, contractExtraWork.length]);

  const isCompleted = job.status === "completed";
  const canEditCrew = job.status === "scheduled";

  function update(next: VisitWorkState) {
    if (!canEditCrew) return;
    setState(next);
    saveVisitWorkState(job.id, next);
  }

  function addEmployee(e: FormEvent) {
    e.preventDefault();
    if (!canEditCrew) return;
    const member = state.assignedEmployees.find(
      (row) => row.id === laborEmployeeId
    );
    const hours = Number(employeeHours);
    if (!member || Number.isNaN(hours) || hours < 0) return;
    if (state.employees.some((row) => row.name === member.name)) return;
    update({
      ...state,
      employees: [
        ...state.employees,
        { id: member.id, name: member.name, hours },
      ],
    });
    setLaborEmployeeId("");
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
    const hoursRaw = extraHours.trim();
    const hours = hoursRaw === "" ? undefined : Number(hoursRaw);
    if (hoursRaw !== "" && (Number.isNaN(hours) || (hours ?? 0) < 0)) return;
    update({
      ...state,
      extraWorkNotes: [
        ...state.extraWorkNotes,
        {
          id: crypto.randomUUID(),
          description,
          status: extraStatus,
          ...(hours != null ? { hours } : {}),
        },
      ],
    });
    setExtraDescription("");
    setExtraHours("");
    setExtraStatus("pending_approval");
  }

  function addExtraWorkHoursOnly(e: FormEvent) {
    e.preventDefault();
    if (!canEditCrew) return;
    const description = extraDescription.trim();
    const hours = Number(extraHours);
    if (!description || Number.isNaN(hours) || hours < 0) return;
    update({
      ...state,
      extraWorkNotes: [
        ...state.extraWorkNotes,
        {
          id: crypto.randomUUID(),
          description,
          status: "pending_approval",
          hours,
        },
      ],
    });
    setExtraDescription("");
    setExtraHours("");
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
      employees: state.employees.filter((row) => row.id !== id),
    });
  }

  const totalHours = state.employees.reduce((sum, row) => sum + row.hours, 0);
  const availableToAssign = roster.filter(
    (member) => !state.assignedEmployees.some((row) => row.id === member.id)
  );
  const availableForLabor = state.assignedEmployees.filter(
    (member) => !state.employees.some((row) => row.name === member.name)
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
  const tasksDone = state.completedTaskIds.length;

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
    if (!exceptionDetails.trim()) return;
    addFieldException({
      jobId: job.id,
      customerName: job.customerName,
      address: job.address,
      type: exceptionType,
      details: exceptionDetails.trim(),
    });
    setExceptionDetails("");
    setExceptionMessage("Sent to manager.");
    window.setTimeout(() => setExceptionMessage(""), 3000);
  }

  const hoursByName = new Map(
    state.employees.map((row) => [row.name, row] as const)
  );

  const crewSection = (
    <Section
      title="Crew & hours"
      hint={
        totalHours > 0
          ? `${state.assignedEmployees.length} assigned · ${totalHours.toFixed(1)} hrs logged`
          : `${state.assignedEmployees.length} assigned`
      }
    >
      {state.assignedEmployees.length === 0 ? (
        <p className="text-sm text-stone-500">No crew assigned yet.</p>
      ) : (
        <ul className="space-y-2">
          {state.assignedEmployees.map((member) => {
            const labor = hoursByName.get(member.name);
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-stone-900">{member.name}</p>
                  <p className="text-xs text-stone-500">{member.role}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-stone-700">
                    {labor ? `${labor.hours} hrs` : "No hours"}
                  </span>
                  {canEditCrew && labor ? (
                    <button
                      type="button"
                      onClick={() => removeEmployee(labor.id)}
                      className="text-xs text-stone-500 hover:text-red-700"
                    >
                      Clear hrs
                    </button>
                  ) : null}
                  {canEditCrew ? (
                    <button
                      type="button"
                      onClick={() => unassignEmployee(member.id)}
                      className="text-xs text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEditCrew ? (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          {availableToAssign.length > 0 ? (
            <form
              onSubmit={assignEmployee}
              className="flex flex-wrap items-center gap-2"
            >
              <select
                value={assignId}
                onChange={(e) => setAssignId(e.target.value)}
                className="min-w-[180px] flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Add crew member…</option>
                {availableToAssign.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50"
              >
                Assign
              </button>
            </form>
          ) : null}

          {availableForLabor.length > 0 ? (
            <form
              onSubmit={addEmployee}
              className="grid gap-2 sm:grid-cols-[1fr_90px_auto]"
            >
              <select
                value={laborEmployeeId}
                onChange={(e) => setLaborEmployeeId(e.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                required
              >
                <option value="">Log hours for…</option>
                {availableForLabor.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.25"
                value={employeeHours}
                onChange={(e) => setEmployeeHours(e.target.value)}
                placeholder="Hours"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                required
              />
              <button
                type="submit"
                className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Save
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </Section>
  );

  if (variant === "planning") {
    return (
      <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
        <p className="text-xs text-stone-500">
          Plan crew, hours, tasks, and extra work · {job.address}
        </p>
        {crewSection}

        <Section
          title="Tasks"
          hint={`${tasksDone} of ${tasks.length} done`}
        >
          <ul className="space-y-2">
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
                    <span
                      className={checked ? "text-stone-400 line-through" : ""}
                    >
                      {task.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section
          title="Extra work (hours)"
          hint="Log extra work with estimated hours only"
        >
          {contractExtraWork.length > 0 ? (
            <ul className="mb-3 space-y-2">
              {contractExtraWork.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md bg-stone-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="text-stone-500">
                    {" "}
                    · {formatStatusLabel(item.status)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {state.extraWorkNotes.length > 0 ? (
            <ul className="mb-3 space-y-2">
              {state.extraWorkNotes.map((note) => (
                <li
                  key={note.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                >
                  <span className="text-stone-800">{note.description}</span>
                  <span className="shrink-0 font-medium text-stone-800">
                    {note.hours != null ? `${note.hours} hrs` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : contractExtraWork.length === 0 ? (
            <p className="mb-3 text-sm text-stone-500">No extra work logged yet.</p>
          ) : null}

          {canEditCrew ? (
            <form
              onSubmit={addExtraWorkHoursOnly}
              className="grid gap-2 sm:grid-cols-[1fr_90px_auto]"
            >
              <input
                type="text"
                value={extraDescription}
                onChange={(e) => setExtraDescription(e.target.value)}
                placeholder="Extra work description…"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="number"
                min="0"
                step="0.25"
                value={extraHours}
                onChange={(e) => setExtraHours(e.target.value)}
                placeholder="Hours"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                required
              />
              <button
                type="submit"
                className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Add
              </button>
            </form>
          ) : null}
        </Section>

        <Section title="Supplies needed">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-medium text-stone-500">Materials</p>
              <p className="mt-1 text-stone-800">{materials.join(" · ")}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500">Equipment</p>
              <p className="mt-1 text-stone-800">{equipment.join(" · ")}</p>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {isCompleted ? (
        <p className="text-xs text-stone-500">Completed visit — view only.</p>
      ) : null}

      <Section title="1. Time clock" hint={`Planned ${plannedHours.toFixed(1)} hrs`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-stone-500">Start</p>
              <p className="font-medium text-green-950">
                {formatClock(state.jobStartedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">End</p>
              <p className="font-medium text-green-950">
                {formatClock(state.jobEndedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Actual</p>
              <p className="font-medium text-green-950">
                {clockedHours != null ? `${clockedHours.toFixed(1)} hrs` : "—"}
              </p>
            </div>
          </div>
          {canEditCrew ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startJob}
                className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                {state.jobStartedAt ? "Restart" : "Start"}
              </button>
              <button
                type="button"
                onClick={endJob}
                disabled={!state.jobStartedAt || !!state.jobEndedAt}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-40"
              >
                End
              </button>
            </div>
          ) : null}
        </div>
      </Section>

      {crewSection}

      <Section
        title="3. Tasks"
        hint={`${tasksDone} of ${tasks.length} done`}
      >
        <ul className="space-y-2">
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
      </Section>

      <Section title="4. Supplies">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs font-medium text-stone-500">Materials</p>
            <p className="mt-1 text-stone-800">{materials.join(" · ")}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-stone-500">Equipment</p>
            <p className="mt-1 text-stone-800">{equipment.join(" · ")}</p>
          </div>
        </div>
      </Section>

      <div className="rounded-lg border border-stone-200 bg-white">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-green-950"
        >
          More (extra work, issues, notes)
          <span className="text-xs font-medium text-green-800">
            {showMore ? "Hide" : "Show"}
          </span>
        </button>

        {showMore ? (
          <div className="space-y-4 border-t border-stone-100 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-stone-800">Extra work</p>
              {contractExtraWork.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {contractExtraWork.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-md bg-stone-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{item.title}</span>
                      <span className="text-stone-500">
                        {" "}
                        · {isCompleted ? "Approved" : formatStatusLabel(item.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-stone-500">None from management.</p>
              )}

              {state.extraWorkNotes.map((note) => (
                <div
                  key={note.id}
                  className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p>{note.description}</p>
                    {note.hours != null ? (
                      <span className="shrink-0 font-medium text-stone-800">
                        {note.hours} hrs
                      </span>
                    ) : null}
                  </div>
                  {canEditCrew ? (
                    <select
                      value={note.status}
                      onChange={(e) =>
                        updateExtraStatus(
                          note.id,
                          e.target
                            .value as (typeof EXTRA_STATUSES)[number]["value"]
                        )
                      }
                      className="mt-2 rounded border border-stone-300 bg-white px-2 py-1 text-xs"
                    >
                      {EXTRA_STATUSES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-xs text-stone-500">
                      {formatStatusLabel(note.status)}
                    </p>
                  )}
                </div>
              ))}

              {canEditCrew ? (
                <form onSubmit={addExtraWork} className="mt-3 space-y-2">
                  <textarea
                    value={extraDescription}
                    onChange={(e) => setExtraDescription(e.target.value)}
                    placeholder="Describe extra work…"
                    rows={2}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={extraHours}
                      onChange={(e) => setExtraHours(e.target.value)}
                      placeholder="Hours"
                      className="w-24 rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={extraStatus}
                      onChange={(e) =>
                        setExtraStatus(
                          e.target
                            .value as (typeof EXTRA_STATUSES)[number]["value"]
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
                      Add
                    </button>
                  </div>
                </form>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-medium text-stone-800">
                Report a problem
              </p>
              {canEditCrew ? (
                <form onSubmit={submitException} className="mt-2 space-y-2">
                  <select
                    value={exceptionType}
                    onChange={(e) =>
                      setExceptionType(e.target.value as FieldExceptionType)
                    }
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="could_not_access">Could not access site</option>
                    <option value="dog_loose">Dog loose / unsafe animal</option>
                    <option value="equipment_failure">Equipment failure</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea
                    value={exceptionDetails}
                    onChange={(e) => setExceptionDetails(e.target.value)}
                    placeholder="What happened?"
                    rows={2}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    Send to manager
                  </button>
                  {exceptionMessage ? (
                    <p className="text-sm text-green-800">{exceptionMessage}</p>
                  ) : null}
                </form>
              ) : (
                <p className="mt-1 text-sm text-stone-500">
                  Available on scheduled visits.
                </p>
              )}
            </div>

            <CrewSiteNotes customerId={job.customerId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
