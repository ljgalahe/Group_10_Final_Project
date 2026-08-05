"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui";
import {
  addManagementExtraRequest,
  DEFAULT_DAILY_ROSTER,
  loadDailyRoster,
  loadFieldExceptions,
  loadManagementExtraRequests,
  saveDailyRoster,
  type CrewMember,
  type ManagementExtraWorkRequest,
} from "@/components/crew-lead/crewLeadStorage";
import type { FieldExceptionReport } from "@/components/crew-lead/schedule-types";
import { formatStatusLabel } from "@/components/crew-lead/visitWorkDefaults";

/** Links plus Extra Work approval + today's crew roster for Crew Lead dashboard. */
export function CrewLeadQuickActions() {
  const [roster, setRoster] = useState<CrewMember[]>(DEFAULT_DAILY_ROSTER);
  const [requests, setRequests] = useState<ManagementExtraWorkRequest[]>([]);
  const [exceptions, setExceptions] = useState<FieldExceptionReport[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Crew Member");
  const [submittedMessage, setSubmittedMessage] = useState("");

  useEffect(() => {
    setRoster(loadDailyRoster());
    setRequests(loadManagementExtraRequests());
    setExceptions(loadFieldExceptions());
  }, []);

  function submitExtraWork(e: FormEvent) {
    e.preventDefault();
    const hours = Number(estimatedHours);
    if (!customerName.trim() || !description.trim() || Number.isNaN(hours)) {
      return;
    }
    addManagementExtraRequest({
      customerName: customerName.trim(),
      jobLocation: jobLocation.trim() || "Oxford, MS",
      description: description.trim(),
      estimatedHours: hours,
    });
    setRequests(loadManagementExtraRequests());
    setCustomerName("");
    setJobLocation("");
    setDescription("");
    setEstimatedHours("");
    setSubmittedMessage("Extra work request submitted to management.");
    window.setTimeout(() => setSubmittedMessage(""), 3000);
  }

  function addRosterMember(e: FormEvent) {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;
    const next = [
      ...roster,
      {
        id: crypto.randomUUID(),
        name,
        role: newMemberRole.trim() || "Crew Member",
      },
    ];
    setRoster(next);
    saveDailyRoster(next);
    setNewMemberName("");
    setNewMemberRole("Crew Member");
  }

  function removeRosterMember(id: string) {
    const next = roster.filter((member) => member.id !== id);
    setRoster(next);
    saveDailyRoster(next.length > 0 ? next : DEFAULT_DAILY_ROSTER);
    if (next.length === 0) setRoster(DEFAULT_DAILY_ROSTER);
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap gap-3">
        <a
          href="/schedule"
          className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
        >
          Open Schedule
        </a>
        <a
          href="/schedule#todays-route"
          className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
        >
          Today&apos;s Route
        </a>
        <a
          href="/visits"
          className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
        >
          Open Visits
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-green-800/20 bg-stone-50">
          <h3 className="text-base font-semibold text-green-950">
            Submit Extra Work for Approval
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Send extra work requests to management for review.
          </p>
          <form onSubmit={submitExtraWork} className="mt-3 space-y-2">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={jobLocation}
              onChange={(e) => setJobLocation(e.target.value)}
              placeholder="Job Location (optional)"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the extra work needing approval..."
              rows={3}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="number"
              min="0"
              step="0.25"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="Estimated Hours"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Submit to Management
            </button>
            {submittedMessage ? (
              <p className="text-sm text-green-800">{submittedMessage}</p>
            ) : null}
          </form>

          {requests.length > 0 ? (
            <div className="mt-4 border-t border-stone-200 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Recent Submissions
              </p>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {requests.slice(0, 5).map((request) => (
                  <li
                    key={request.id}
                    className="rounded-md border border-stone-200 bg-white p-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-green-950">
                          {request.customerName}
                        </p>
                        <p className="text-xs text-stone-600">
                          {request.description}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {request.estimatedHours} hrs · {request.jobLocation}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                        {formatStatusLabel(request.status)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card className="border-green-800/20 bg-stone-50">
          <h3 className="text-base font-semibold text-green-950">
            Today&apos;s Crew
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Employees scheduled for your crew today.
          </p>
          <ul className="mt-3 space-y-2">
            {roster.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-green-950">{member.name}</p>
                  <p className="text-xs text-stone-500">{member.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeRosterMember(member.id)}
                  className="text-xs font-medium text-red-700 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={addRosterMember}
            className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Employee Name"
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              placeholder="Role"
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Add
            </button>
          </form>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50/60">
        <h3 className="text-base font-semibold text-green-950">
          Field Exceptions Sent to Management
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Reports from visits (access issues, animals, equipment failures).
        </p>
        {exceptions.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            No exception reports yet. Submit them from a scheduled visit&apos;s
            details.
          </p>
        ) : (
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {exceptions.slice(0, 8).map((report) => (
              <li
                key={report.id}
                className="rounded-md border border-amber-200 bg-white p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-green-950">
                      {report.customerName}
                    </p>
                    <p className="text-xs font-semibold text-amber-900">
                      {formatStatusLabel(report.type)}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      {report.details}
                    </p>
                    <p className="mt-1 text-[11px] text-stone-500">
                      {report.address} ·{" "}
                      {new Date(report.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                    Sent to Manager
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
