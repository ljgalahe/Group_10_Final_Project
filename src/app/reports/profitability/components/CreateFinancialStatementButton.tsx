"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  downloadFinancialStatementPdf,
  financialStatementFilename,
} from "@/app/reports/profitability/lib/generate-financial-statement-pdf";
import {
  periodLabel,
  statementTitle,
  type FinancialStatementInputs,
  type PeriodType,
  type StatementType,
} from "@/app/reports/profitability/lib/financial-statement-data";

const STATEMENT_OPTIONS: { value: StatementType; label: string }[] = [
  { value: "balance_sheet", label: "Balance Sheet" },
  { value: "income_statement", label: "Income Statement" },
  { value: "cash_flows", label: "Statement of Cash Flows" },
];

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "year_end", label: "Year End" },
];

export function CreateFinancialStatementButton({
  inputs,
}: {
  inputs: FinancialStatementInputs;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [statementType, setStatementType] =
    useState<StatementType>("income_statement");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [status, setStatus] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog so the page header / trigger is not highlighted.
    triggerRef.current?.blur();
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setStatus(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.blur();
    };
  }, [open]);

  function handleClose() {
    setOpen(false);
    setStatus(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    downloadFinancialStatementPdf(inputs, statementType, periodType);
    setStatus(
      `Downloaded ${financialStatementFilename(statementType, periodType)}`
    );
  }

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={handleClose}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="financial-statement-title"
              tabIndex={-1}
              className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl outline-none"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="financial-statement-title"
                    className="text-lg font-semibold text-green-950"
                  >
                    Create Financial Statement
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Choose the statement type and reporting period, then download
                    a PDF generated from current profitability and billing data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-stone-400 hover:text-stone-600"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                <fieldset>
                  <legend className="text-sm font-medium text-stone-700">
                    Statement type
                  </legend>
                  <div className="mt-2 space-y-2">
                    {STATEMENT_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50 has-[:checked]:border-green-700 has-[:checked]:bg-green-50"
                      >
                        <input
                          type="radio"
                          name="statement_type"
                          value={option.value}
                          checked={statementType === option.value}
                          onChange={() => setStatementType(option.value)}
                          className="text-green-800"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-medium text-stone-700">
                    Reporting period
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {PERIOD_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50 has-[:checked]:border-green-700 has-[:checked]:bg-green-50"
                      >
                        <input
                          type="radio"
                          name="period_type"
                          value={option.value}
                          checked={periodType === option.value}
                          onChange={() => setPeriodType(option.value)}
                          className="text-green-800"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {periodLabel(periodType)}
                  </p>
                </fieldset>

                {status ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                    {status}
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Download PDF
                  </button>
                </div>
              </form>

              <p className="mt-4 text-xs text-stone-400">
                Preview: {statementTitle(statementType)} ·{" "}
                {periodLabel(periodType)}
              </p>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
      >
        Create Financial Statement
      </button>
      {modal}
    </>
  );
}
