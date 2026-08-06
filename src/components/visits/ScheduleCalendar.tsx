"use client";

import { useEffect, useMemo, useState } from "react";
import { ViewAllToggle } from "@/components/visits/ViewAllToggle";
import { formatCurrency, formatDate } from "@/lib/format";
import type { JobRow } from "@/lib/visit-jobs";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type FilterMode = "company" | "employee" | "job";
type StatusFilter = "all" | "completed" | "pending";

function toMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function parseDateParts(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, monthIndex: m - 1, day: d };
}

function modeAllLabel(mode: FilterMode) {
  if (mode === "company") return "All companies";
  if (mode === "employee") return "All employees";
  return "All jobs";
}

function modeNameLabel(mode: FilterMode) {
  if (mode === "company") return "Company name";
  if (mode === "employee") return "Employee name";
  return "Job name";
}

function isPending(status: string) {
  return status === "scheduled";
}

function isCompleted(status: string) {
  return status === "completed";
}

function dayStatusTone(dayJobs: JobRow[]) {
  const hasCompleted = dayJobs.some((j) => isCompleted(j.status));
  const hasPending = dayJobs.some((j) => isPending(j.status));
  if (hasCompleted && hasPending) return "mixed" as const;
  if (hasCompleted) return "completed" as const;
  if (hasPending) return "pending" as const;
  return "none" as const;
}

export function ScheduleCalendar({
  jobs,
  onDateChange,
  onFilteredJobsChange,
  hidePay = false,
}: {
  jobs: JobRow[];
  onDateChange?: (date: string | null) => void;
  onFilteredJobsChange?: (jobs: JobRow[]) => void;
  /** When true, show hours only (no $/hr or pay totals). Used for crew lead/member. */
  hidePay?: boolean;
}) {
  const companies = useMemo(() => {
    const names = [...new Set(jobs.map((j) => j.companyName))];
    return names.sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const employees = useMemo(() => {
    const names = new Set<string>();
    for (const job of jobs) {
      for (const member of job.crew) names.add(member.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const jobTitles = useMemo(() => {
    const names = [...new Set(jobs.map((j) => j.jobLabel))];
    return names.sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const [filterMode, setFilterMode] = useState<FilterMode>("company");
  const [selectedName, setSelectedName] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const nameOptions =
    filterMode === "company"
      ? companies
      : filterMode === "employee"
        ? employees
        : jobTitles;

  const filteredJobs = useMemo(() => {
    let list = jobs;

    if (statusFilter === "completed") {
      list = list.filter((j) => isCompleted(j.status));
    } else if (statusFilter === "pending") {
      list = list.filter((j) => isPending(j.status));
    }

    if (selectedName === "all") return list;
    if (filterMode === "company") {
      return list.filter((j) => j.companyName === selectedName);
    }
    if (filterMode === "employee") {
      return list.filter((j) => j.crew.some((m) => m.name === selectedName));
    }
    return list.filter((j) => j.jobLabel === selectedName);
  }, [jobs, filterMode, selectedName, statusFilter]);

  useEffect(() => {
    onFilteredJobsChange?.(filteredJobs);
    // Parent may pass an inline callback; only re-notify when the filter result changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [filteredJobs]);

  const initial = useMemo(() => {
    const source = filteredJobs.length > 0 ? filteredJobs : jobs;
    if (source.length === 0) {
      const now = new Date();
      return { year: now.getFullYear(), monthIndex: now.getMonth() };
    }
    const sorted = [...source].sort((a, b) => a.date.localeCompare(b.date));
    const scheduled = sorted.find((j) => j.status === "scheduled") ?? sorted[0];
    const parts = parseDateParts(scheduled.date);
    return { year: parts.year, monthIndex: parts.monthIndex };
  }, [filteredJobs, jobs]);

  const [year, setYear] = useState(initial.year);
  const [monthIndex, setMonthIndex] = useState(initial.monthIndex);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewAll, setViewAll] = useState(false);

  const jobsByDate = useMemo(() => {
    const map = new Map<string, JobRow[]>();
    for (const job of filteredJobs) {
      const list = map.get(job.date) ?? [];
      list.push(job);
      map.set(job.date, list);
    }
    return map;
  }, [filteredJobs]);

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const monthLabel = new Date(year, monthIndex, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    const next = new Date(year, monthIndex + delta, 1);
    setYear(next.getFullYear());
    setMonthIndex(next.getMonth());
    setSelectedDate(null);
    setViewAll(false);
  }

  const selectedJobs = selectedDate ? (jobsByDate.get(selectedDate) ?? []) : [];

  const employeeRows = selectedJobs.flatMap((job) =>
    job.crew
      .filter((member) =>
        filterMode === "employee" && selectedName !== "all"
          ? member.name === selectedName
          : true
      )
      .map((member) => ({
        key: `${job.visitId}-${member.name}`,
        employee: member.name,
        role: member.role,
        hours: member.hours,
        payRate: member.payRate,
        jobLabel: job.jobLabel,
        companyName: job.companyName,
        status: job.status,
        pay: member.hours * member.payRate,
      }))
  );

  const filterSummary =
    selectedName === "all" ? modeAllLabel(filterMode) : selectedName;
  const statusSummary =
    statusFilter === "all"
      ? "All statuses"
      : statusFilter === "completed"
        ? "Completed"
        : "Pending";

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-stone-600">
          Filter schedule by
          <select
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value as FilterMode);
              setSelectedName("all");
              setSelectedDate(null);
              setViewAll(false);
            }}
          >
            <option value="company">Companies</option>
            <option value="employee">Employees</option>
            <option value="job">Jobs</option>
          </select>
        </label>

        <label className="block text-sm text-stone-600">
          {modeNameLabel(filterMode)}
          <select
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={selectedName}
            onChange={(e) => {
              setSelectedName(e.target.value);
              setSelectedDate(null);
              setViewAll(false);
            }}
          >
            <option value="all">{modeAllLabel(filterMode)}</option>
            {nameOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-stone-600">
          Status
          <select
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setSelectedDate(null);
              setViewAll(false);
            }}
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-700" />
          Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Pending
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
        >
          Previous
        </button>
        <p className="text-sm font-semibold text-green-950">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${toMonthKey(year, monthIndex)}-${String(day).padStart(2, "0")}`;
          const dayJobs = jobsByDate.get(dateStr) ?? [];
          const hasJobs = dayJobs.length > 0;
          const isSelected = selectedDate === dateStr;
          const tone = dayStatusTone(dayJobs);

          let dayClass =
            "border-stone-100 bg-white text-stone-500 hover:bg-stone-50";
          let useSplit = false;

          if (isSelected && tone === "mixed") {
            useSplit = true;
            dayClass = "border-stone-400 text-white";
          } else if (isSelected && tone === "pending") {
            dayClass = "border-amber-600 bg-amber-500 text-white";
          } else if (isSelected) {
            dayClass = "border-green-800 bg-green-800 text-white";
          } else if (tone === "completed") {
            dayClass =
              "border-green-200 bg-green-50 text-green-950 hover:border-green-700";
          } else if (tone === "pending") {
            dayClass =
              "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-500";
          } else if (tone === "mixed") {
            useSplit = true;
            dayClass =
              "border-stone-300 text-stone-900 hover:border-stone-500";
          }

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => {
                setSelectedDate(dateStr);
                setViewAll(false);
                onDateChange?.(dateStr);
              }}
              className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-lg border text-sm transition ${dayClass}`}
            >
              {useSplit ? (
                <>
                  <span
                    className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 ${
                      isSelected ? "bg-green-800" : "bg-green-100"
                    }`}
                    aria-hidden
                  />
                  <span
                    className={`pointer-events-none absolute inset-y-0 right-0 w-1/2 ${
                      isSelected ? "bg-amber-500" : "bg-amber-100"
                    }`}
                    aria-hidden
                  />
                </>
              ) : null}
              <span className="relative z-10 font-medium">{day}</span>
              {hasJobs ? (
                <span
                  className={`relative z-10 mt-0.5 text-[10px] font-semibold leading-none ${
                    isSelected
                      ? "text-white"
                      : tone === "pending"
                        ? "text-amber-800"
                        : tone === "completed"
                          ? "text-green-800"
                          : "text-stone-700"
                  }`}
                >
                  {dayJobs.length}{" "}
                  {dayJobs.length === 1 ? "job" : "jobs"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        {!selectedDate ? (
          <p className="text-sm text-stone-500">
            Filter by company, employee, job, or status, then click a day for
            crew assignments.
          </p>
        ) : employeeRows.length === 0 ? (
          <p className="text-sm text-stone-500">
            No crew scheduled for {formatDate(selectedDate)}
            {selectedName !== "all" || statusFilter !== "all"
              ? ` · ${filterSummary} · ${statusSummary}`
              : ""}
            .
          </p>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-green-950">
                {formatDate(selectedDate)} · {filterSummary} · {statusSummary} —
                crew assignments
              </p>
              <ViewAllToggle
                viewAll={viewAll}
                onToggle={() => setViewAll((v) => !v)}
                count={employeeRows.length}
              />
            </div>
            <ul
              className={
                viewAll
                  ? "mt-3 space-y-2"
                  : "mt-3 max-h-56 space-y-2 overflow-y-auto pr-2"
              }
            >
              {employeeRows.map((row) => {
                const pending = isPending(row.status);
                return (
                  <li
                    key={row.key}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      pending
                        ? "border-amber-200 bg-amber-50"
                        : "border-green-200 bg-green-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-stone-900">{row.employee}</p>
                      <span
                        className={`text-xs font-semibold ${
                          pending ? "text-amber-700" : "text-green-800"
                        }`}
                      >
                        {pending ? "Pending" : "Completed"}
                      </span>
                    </div>
                    <p className="text-stone-600">
                      {row.role} · {row.jobLabel}
                      {filterMode === "company" && selectedName !== "all"
                        ? null
                        : ` @ ${row.companyName}`}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {hidePay
                        ? `${row.hours}h`
                        : `${row.hours}h × ${formatCurrency(row.payRate)} = ${formatCurrency(row.pay)}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
