"use client";

import { useActionState } from "react";
import {
  submitProspectInquiry,
  type SubmitInquiryResult,
} from "@/app/inquiries/actions";

const PROPERTY_OPTIONS = [
  { value: "office_park", label: "Office park" },
  { value: "retail_center", label: "Retail center" },
  { value: "industrial", label: "Industrial" },
  { value: "multifamily", label: "Multifamily" },
  { value: "other", label: "Other" },
] as const;

const SERVICE_OPTIONS = [
  { value: "mowing", label: "Mowing & grounds care" },
  { value: "irrigation", label: "Irrigation" },
  { value: "seasonal_color", label: "Seasonal color" },
  { value: "snow_removal", label: "Snow removal" },
  { value: "other", label: "Other services" },
] as const;

export function ProspectInquiryForm({
  variant = "default",
}: {
  variant?: "default" | "overlay";
}) {
  const [state, formAction, pending] = useActionState<
    SubmitInquiryResult | null,
    FormData
  >(submitProspectInquiry, null);

  const compact = variant === "overlay";
  const inputClass = compact
    ? "mt-1 w-full rounded border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/30"
    : "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-green-700 focus:ring-2 focus:ring-green-700/20";
  const labelClass = compact
    ? "block text-xs font-medium text-stone-600"
    : "block text-sm font-medium text-stone-700";

  if (state?.ok) {
    return (
      <div
        className={
          compact
            ? "rounded-sm border border-green-100 bg-white p-8 text-center shadow-2xl"
            : "rounded-2xl border border-green-200 bg-white p-8 text-center shadow-lg"
        }
      >
        <p className="text-lg font-semibold text-green-950">
          Thanks for reaching out — we received your note.
        </p>
        <p className="mt-2 text-sm text-stone-600">
          A real person on our team will review your property details and get
          back to you with next steps for quoting and service.
        </p>
      </div>
    );
  }

  return (
    <form
      id="request-service"
      action={formAction}
      className={
        compact
          ? "max-h-[min(82vh,720px)] overflow-y-auto rounded-sm bg-white p-5 shadow-2xl sm:p-6"
          : "rounded-2xl border border-stone-200 bg-white p-6 shadow-lg sm:p-8"
      }
    >
      <h2
        className={
          compact
            ? "text-center text-xl font-semibold text-stone-900"
            : "text-xl font-semibold text-green-950"
        }
      >
        {compact ? "We’d love to hear from you" : "Request a commercial proposal"}
      </h2>
      <p
        className={
          compact
            ? "mt-1.5 text-center text-sm leading-relaxed text-stone-500"
            : "mt-1 text-sm text-stone-500"
        }
      >
        {compact
          ? "Share a little about your property—our local team reads every message and will help you figure out next steps."
          : "New to GreenScape? Tell us about your property and the services you need."}
      </p>

      <div className={compact ? "mt-4 grid gap-3 sm:grid-cols-2" : "mt-6 grid gap-5 sm:grid-cols-2"}>
        <div className="sm:col-span-2">
          <label htmlFor="company_name" className={labelClass}>
            Company name <span className="text-red-600">*</span>
          </label>
          <input
            id="company_name"
            name="company_name"
            required
            autoComplete="organization"
            className={inputClass}
            placeholder="Riverside Retail Partners"
          />
        </div>
        <div>
          <label htmlFor="contact_name" className={labelClass}>
            Contact name <span className="text-red-600">*</span>
          </label>
          <input
            id="contact_name"
            name="contact_name"
            required
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact_email" className={labelClass}>
            Email <span className="text-red-600">*</span>
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact_phone" className={labelClass}>
            Phone
          </label>
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="property_type" className={labelClass}>
            Property type <span className="text-red-600">*</span>
          </label>
          <select
            id="property_type"
            name="property_type"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Select type…
            </option>
            {PROPERTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="property_address" className={labelClass}>
            Property address <span className="text-red-600">*</span>
          </label>
          <input
            id="property_address"
            name="property_address"
            required
            autoComplete="street-address"
            className={inputClass}
          />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className={labelClass}>
            Services interested <span className="text-red-600">*</span>
          </legend>
          <div
            className={
              compact
                ? "mt-1.5 grid gap-1.5 sm:grid-cols-2"
                : "mt-2 grid gap-2 sm:grid-cols-2"
            }
          >
            {SERVICE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={
                  compact
                    ? "flex cursor-pointer items-center gap-2 text-xs text-stone-700"
                    : "flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 hover:border-green-700/40"
                }
              >
                <input
                  type="checkbox"
                  name="services_interested"
                  value={opt.value}
                  className="h-3.5 w-3.5 rounded border-stone-300 text-green-800 focus:ring-green-700"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <label htmlFor="message" className={labelClass}>
            Tell us your story
          </label>
          <textarea
            id="message"
            name="message"
            rows={compact ? 4 : 5}
            className={inputClass}
            placeholder={
              compact
                ? "What’s going on with the property? Season timing, acreage, a remodel, or what made you reach out today…"
                : "Season timing, acreage, or other details…"
            }
          />
          {compact ? (
            <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
              No perfect pitch needed—notes from busy property managers are
              welcome.
            </p>
          ) : null}
        </div>
      </div>

      {state && !state.ok ? (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={
          compact
            ? "mt-4 w-full rounded bg-green-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            : "mt-6 w-full rounded-lg bg-green-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {pending ? "Sending…" : "Send us a note"}
      </button>
    </form>
  );
}
