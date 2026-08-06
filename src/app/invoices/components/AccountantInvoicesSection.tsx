import type { ReactNode } from "react";

export function AccountantInvoicesSection({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const countLabel =
    count === 1 ? "1 invoice" : `${count} invoices`;

  return (
    <details className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-stone-50 px-4 py-3 text-green-950 marker:content-none [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-lg font-semibold">Invoices</h2>
          <p className="text-sm text-stone-500">
            Bills generated from contract terms and approved extra work — expand
            to view all {countLabel}.
          </p>
        </div>
        <span className="shrink-0 text-sm text-stone-500 group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="border-t border-stone-200">{children}</div>
    </details>
  );
}
