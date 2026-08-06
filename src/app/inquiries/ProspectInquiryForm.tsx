"use client";

import { useActionState, useState } from "react";
import {
  submitProspectInquiry,
  type SubmitInquiryResult,
} from "@/app/inquiries/actions";
import { COMMERCIAL_SERVICES } from "@/lib/commercial-services";

const PROPERTY_OPTIONS = [
  { value: "office_park", label: "Office park" },
  { value: "retail_center", label: "Retail center" },
  { value: "hospitality", label: "Hotel / hospitality" },
  { value: "institutional", label: "Campus / science & cultural" },
  { value: "industrial", label: "Industrial" },
  { value: "multifamily", label: "Residential community" },
  { value: "other", label: "Other" },
] as const;

const SERVICE_OPTIONS = COMMERCIAL_SERVICES.map((service) => ({
  value: service.value,
  label: service.title,
}));

export function ProspectInquiryForm({
  variant = "default",
}: {
  variant?: "default" | "overlay" | "welcome";
}) {
  const [state, formAction, pending] = useActionState<
    SubmitInquiryResult | null,
    FormData
  >(submitProspectInquiry, null);
  const [otherSelected, setOtherSelected] = useState(false);

  const compact = variant === "overlay";
  const welcome = variant === "welcome";
  const inputClass = welcome
    ? "mt-1.5 w-full border border-[#d0d9d1] bg-[#fbfcfb] px-3.5 py-2.5 text-sm text-[#1c2a22] outline-none transition placeholder:text-[#8a968c] focus:border-[#3d5346] focus:bg-white"
    : compact
      ? "mt-1 w-full rounded border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/30"
      : "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-green-700 focus:ring-2 focus:ring-green-700/20";
  const labelClass = welcome
    ? "block text-[11px] font-medium uppercase tracking-[0.14em] text-[#5a6e60]"
    : compact
      ? "block text-xs font-medium text-stone-600"
      : "block text-sm font-medium text-stone-700";

  if (state?.ok) {
    return (
      <div
        className={
          welcome
            ? "border border-[#c5d0c6] bg-white p-8 text-center shadow-lg"
            : compact
              ? "rounded-sm border border-green-100 bg-white p-8 text-center shadow-2xl"
              : "rounded-2xl border border-green-200 bg-white p-8 text-center shadow-lg"
        }
      >
        <p
          className={
            welcome
              ? "font-display text-2xl font-semibold text-[#1c2a22]"
              : "text-lg font-semibold text-green-950"
          }
        >
          {welcome
            ? "Request received."
            : "Thank you — we received your request."}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          {welcome
            ? "Our operations team will review your property details and follow up with scope options and pricing."
            : "Our operations team will review your property details and follow up with next steps for quoting and service."}
        </p>
        {welcome ? (
          <a
            href="/"
            className="mt-6 inline-block text-sm font-medium text-[#3d5346] underline-offset-4 hover:underline"
          >
            Back to welcome
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form
      id="request-service"
      action={formAction}
      className={
        welcome
          ? "border border-[#c5d0c6]/90 bg-white/97 p-6 shadow-[0_20px_50px_rgba(28,42,34,0.08)] sm:p-8"
          : compact
            ? "max-h-[min(82vh,720px)] overflow-y-auto rounded-sm bg-white p-5 shadow-2xl sm:p-6"
            : "rounded-2xl border border-stone-200 bg-white p-6 shadow-lg sm:p-8"
      }
    >
      <h2
        className={
          welcome
            ? "font-display text-[1.65rem] font-semibold tracking-tight text-[#1c2a22]"
            : compact
              ? "text-center text-xl font-semibold text-stone-900"
              : "text-xl font-semibold text-green-950"
        }
      >
        {welcome
          ? "Tell us about the property"
          : compact
            ? "Have a Question?"
            : "Request a commercial proposal"}
      </h2>
      <p
        className={
          welcome
            ? "mt-1.5 max-w-md text-sm leading-relaxed text-[#3d5346]"
            : compact
              ? "mt-1 text-center text-sm text-stone-500"
              : "mt-1 text-sm text-stone-500"
        }
      >
        {welcome
          ? "Services, timing, and a few details — we'll follow up with scope and pricing."
          : compact
            ? "Tell us about your commercial property and we will help."
            : "New to GreenScape? Tell us about your property and the services you need."}
      </p>

      <div
        className={
          welcome || !compact
            ? "mt-6 grid gap-5 sm:grid-cols-2"
            : "mt-4 grid gap-3 sm:grid-cols-2"
        }
      >
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
                  welcome
                    ? "flex cursor-pointer items-center gap-2.5 border border-[#d5ddd6] bg-[#f6f8f6] px-3 py-2 text-[13px] leading-snug text-[#1c2a22] transition hover:border-[#3d5346]/45 hover:bg-white"
                    : compact
                      ? "flex cursor-pointer items-center gap-2 text-xs text-stone-700"
                      : "flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 hover:border-green-700/40"
                }
              >
                <input
                  type="checkbox"
                  name="services_interested"
                  value={opt.value}
                  checked={opt.value === "other" ? otherSelected : undefined}
                  onChange={
                    opt.value === "other"
                      ? (e) => setOtherSelected(e.target.checked)
                      : undefined
                  }
                  className={
                    welcome
                      ? "h-3.5 w-3.5 rounded border-[#c5d0c6] text-[#2f4a38] focus:ring-[#3d5346]"
                      : "h-3.5 w-3.5 rounded border-stone-300 text-green-800 focus:ring-green-700"
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
          {otherSelected ? (
            <div className="mt-3">
              <label htmlFor="other_service" className={labelClass}>
                Describe the other service <span className="text-red-600">*</span>
              </label>
              <input
                id="other_service"
                name="other_service"
                required
                className={inputClass}
                placeholder="e.g. playground mulch, holiday lighting, detention pond care…"
              />
            </div>
          ) : null}
        </fieldset>
        <div className="sm:col-span-2">
          <label htmlFor="message" className={labelClass}>
            {welcome ? "Project notes" : "Your question / message"}
          </label>
          <textarea
            id="message"
            name="message"
            rows={compact ? 3 : 4}
            className={inputClass}
            placeholder={
              welcome
                ? "Season timing, acreage, access constraints, or priority areas…"
                : "Season timing, acreage, or other details…"
            }
          />
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
          welcome
            ? "mt-7 w-full bg-[#2f4a38] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#3d5c47] disabled:opacity-60"
            : compact
              ? "mt-4 w-full rounded bg-green-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              : "mt-6 w-full rounded-lg bg-green-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {pending
          ? "Sending…"
          : welcome
            ? "Submit request"
            : "Submit inquiry"}
      </button>
    </form>
  );
}
