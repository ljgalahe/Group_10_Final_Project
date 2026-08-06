"use client";

import { useMemo, useState } from "react";
import {
  completeSiteSurvey,
  createQuoteFromSurvey,
  saveSiteSurvey,
} from "@/app/ops/site-surveys/actions";
import { formatCurrency } from "@/lib/format";
import {
  buildLineItem,
  priceRangeLabel,
  type ServiceCatalogItem,
} from "@/lib/service-pricing";

type Props = {
  surveyId: string;
  status: string;
  quoteId: string | null;
  companyName: string;
  propertyAddress: string;
  contactLine: string;
  initialAcres: number | null;
  interestedServices: string[];
  interestedLabels: string[];
  initialProposedKeys: string[];
  initialNotes: string;
  propertyConcerns: string;
  initialPhotoUrls: string[];
  catalog: ServiceCatalogItem[];
};

export function SiteSurveyForm({
  surveyId,
  status,
  quoteId,
  companyName,
  propertyAddress,
  contactLine,
  initialAcres,
  interestedServices,
  interestedLabels,
  initialProposedKeys,
  initialNotes,
  propertyConcerns,
  initialPhotoUrls,
  catalog,
}: Props) {
  const [acres, setAcres] = useState(
    initialAcres != null && Number.isFinite(initialAcres)
      ? String(initialAcres)
      : ""
  );
  const [proposedKeys, setProposedKeys] = useState<Set<string>>(
    () => new Set(initialProposedKeys)
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialPhotoUrls);
  const [urlDraft, setUrlDraft] = useState("");

  const acresNum = Math.max(Number(acres) || 0.1, 0.1);

  const proposedLines = useMemo(
    () =>
      [...proposedKeys].map((key) => buildLineItem(key, acresNum)),
    [proposedKeys, acresNum]
  );
  const lineTotal = proposedLines.reduce((s, p) => s + p.lineTotal, 0);

  function toggleProposed(key: string) {
    setProposedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addPhotoUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    setPhotoUrls((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setUrlDraft("");
  }

  function removePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

  function onFilePick(files: FileList | null) {
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        if (!dataUrl) return;
        setPhotoUrls((prev) => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-base text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20 sm:py-2 sm:text-sm";

  return (
    <form className="space-y-4 pb-28 sm:space-y-6 sm:pb-6">
      <input type="hidden" name="survey_id" value={surveyId} />
      <input type="hidden" name="photo_urls" value={photoUrls.join("\n")} />
      {[...proposedKeys].map((key) => (
        <input
          key={key}
          type="hidden"
          name="proposed_services"
          value={key}
        />
      ))}

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-green-950 sm:text-lg">
          Property Summary
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:mt-4 sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">Company</dt>
            <dd className="font-medium text-green-950">{companyName}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Address</dt>
            <dd className="break-words text-stone-800">{propertyAddress}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-stone-500">Contact</dt>
            <dd className="break-words text-stone-800">{contactLine}</dd>
          </div>
          <label className="block sm:col-span-1">
            <span className="text-stone-500">Acres</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              name="acres"
              value={acres}
              onChange={(e) => setAcres(e.target.value)}
              className={inputClass}
              required
            />
          </label>
        </dl>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-green-950 sm:text-lg">
          All Services We Offer
        </h2>
        <p className="mt-1 text-xs text-stone-500 sm:text-sm">
          {acresNum} Acres · Acre-Based Pricing
        </p>
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {catalog.map((item) => (
            <li
              key={item.key}
              className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
            >
              <p className="font-medium text-green-950">{item.label}</p>
              <p className="shrink-0 text-stone-700">
                {priceRangeLabel(item.key, acresNum)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-green-950 sm:text-lg">
          Original Services Interested
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {interestedLabels.length === 0 ? (
            <p className="text-sm text-stone-500">None Listed On Inquiry.</p>
          ) : (
            interestedLabels.map((label, i) => (
              <span
                key={`${interestedServices[i] ?? label}-${i}`}
                className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-900"
              >
                {label}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-green-950 sm:text-lg">
          Proposed Services
        </h2>
        <div className="mt-3 grid gap-2">
          {catalog.map((item) => {
            const checked = proposedKeys.has(item.key);
            const line = buildLineItem(item.key, acresNum);
            return (
              <label
                key={item.key}
                className={`flex min-h-[3.25rem] cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm ${
                  checked
                    ? "border-green-700 bg-green-50"
                    : "border-stone-200 bg-stone-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProposed(item.key)}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-stone-300 text-green-800"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="font-medium text-green-950">
                      {item.label}
                    </span>
                    {checked ? (
                      <span className="text-sm font-medium text-green-900">
                        {formatCurrency(line.lineTotal)}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    {formatCurrency(line.unitPrice)} / Acre ·{" "}
                    {priceRangeLabel(item.key, acresNum)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {proposedLines.length > 0 ? (
          <p className="mt-3 text-sm font-semibold text-green-950">
            Estimated Monthly: {formatCurrency(lineTotal)}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-green-950 sm:text-lg">
          Concerns & Notes
        </h2>
        <label className="mt-3 block">
          <span className="text-sm text-stone-500">Initial Notes</span>
          <textarea
            name="initial_notes"
            rows={3}
            defaultValue={initialNotes}
            className={inputClass}
            placeholder="Access, turf, irrigation zones…"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-sm text-stone-500">
            Concerns About The Property
          </span>
          <textarea
            name="property_concerns"
            rows={3}
            defaultValue={propertyConcerns}
            className={inputClass}
            placeholder="Drainage, slope, pets, HOA…"
          />
        </label>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-green-950 sm:text-lg">
          Pictures
        </h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            className={`${inputClass} sm:flex-1`}
            placeholder="https://…"
            inputMode="url"
          />
          <button
            type="button"
            onClick={addPhotoUrl}
            className="rounded-md border border-green-800 px-4 py-3 text-sm font-medium text-green-900 hover:bg-green-50 sm:py-2"
          >
            Add Url
          </button>
        </div>
        <label className="mt-3 block">
          <span className="text-sm text-stone-500">Or Add From Phone</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => {
              onFilePick(e.target.files);
              e.target.value = "";
            }}
            className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-green-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          />
        </label>
        {photoUrls.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photoUrls.map((url) => (
              <li
                key={url.slice(0, 80)}
                className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50"
              >
                <img
                  src={url}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute right-1 top-1 rounded bg-black/60 px-2 py-1 text-xs text-white"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 p-3 backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <button
            type="submit"
            formAction={saveSiteSurvey}
            className="min-h-11 rounded-md border border-green-800 px-4 py-2.5 text-sm font-medium text-green-900 hover:bg-green-50"
          >
            Save Draft
          </button>
          <button
            type="submit"
            formAction={completeSiteSurvey}
            className="min-h-11 rounded-md bg-green-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800"
          >
            Complete Survey
          </button>
          {status === "completed" && !quoteId ? (
            <button
              type="submit"
              formAction={createQuoteFromSurvey}
              className="min-h-11 rounded-md bg-amber-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
            >
              Create Quote From Survey
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
