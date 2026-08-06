"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  getOpenInvoicesForCustomer,
  recordPayment,
} from "@/app/actions/business";
import {
  ServiceHoldBadge,
  ServiceHoldBanner,
} from "@/components/ServiceHoldBanner";
import { ServiceHoldAuditSync } from "@/components/ServiceHoldDashboardCard";
import { EmptyState, StatusBadge } from "@/components/ui";
import type {
  CollectionRiskLevel,
  CustomerCollectionRisk,
  PaymentBehavior,
} from "@/lib/collection-risk";
import { formatCurrency, formatDate } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-utils";
import type { CustomerServiceHold } from "@/lib/service-hold";
import { heldCustomerIdSet } from "@/lib/service-hold";
import type { Payment, PaymentsSummary } from "@/lib/types";
import { PAYMENT_METHODS } from "@/lib/types";

type CustomerOption = { id: string; name: string };

type OpenInvoice = {
  id: string;
  invoice_number: string;
  total: number;
  amount_paid: number;
  status: string;
  customer_id: string;
};

function paymentCustomerId(payment: Payment): string | undefined {
  return (
    payment.invoices?.customers?.id ??
    payment.invoices?.customer_id ??
    payment.customer_id ??
    undefined
  );
}

function paymentCustomerName(payment: Payment): string {
  return payment.invoices?.customers?.name ?? "—";
}

function paymentInvoiceNumber(payment: Payment): string {
  return payment.invoices?.invoice_number ?? "—";
}

export function PaymentsManagerClient({
  payments,
  customers,
  summary,
  collectionRisk,
  serviceHolds = [],
  highRiskOnly = false,
}: {
  payments: Payment[];
  customers: CustomerOption[];
  summary: PaymentsSummary;
  collectionRisk: CustomerCollectionRisk[];
  serviceHolds?: CustomerServiceHold[];
  highRiskOnly?: boolean;
}) {
  const heldIds = useMemo(
    () => heldCustomerIdSet(serviceHolds),
    [serviceHolds]
  );
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [customerFilter, setCustomerFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  function openPaymentPanel(payment: Payment) {
    // Clicking the active row again closes the panel.
    if (selectedPayment?.id === payment.id && panelOpen) {
      closePaymentPanel();
      return;
    }
    setSelectedPayment(payment);
    setPanelOpen(true);
  }

  function closePaymentPanel() {
    setPanelOpen(false);
  }

  function handlePanelExited() {
    setSelectedPayment(null);
    setPanelOpen(false);
  }

  useEffect(() => {
    if (!selectedPayment) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePaymentPanel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPayment]);

  // Safety net: never leave an invisible overlay blocking the page if
  // transitionend does not fire.
  useEffect(() => {
    if (panelOpen || !selectedPayment) return;
    const timer = window.setTimeout(() => {
      setSelectedPayment(null);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [panelOpen, selectedPayment]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const customerId = paymentCustomerId(payment);
      if (customerFilter) {
        if (customerId !== customerFilter) return false;
      }
      if (
        methodFilter &&
        payment.payment_method !== methodFilter &&
        payment.payment_method !== `simulated_${methodFilter}`
      ) {
        return false;
      }
      if (statusFilter && (payment.status ?? "applied") !== statusFilter) {
        return false;
      }
      if (dateFrom && payment.payment_date < dateFrom) return false;
      if (dateTo && payment.payment_date > dateTo) return false;
      return true;
    });
  }, [
    payments,
    customerFilter,
    methodFilter,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

  const filtersActive = Boolean(
    customerFilter || methodFilter || statusFilter || dateFrom || dateTo
  );

  function clearFilters() {
    setCustomerFilter("");
    setMethodFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  }

  function openModal() {
    setSuccessMessage(null);
    setErrorMessage(null);
    setModalOpen(true);
  }

  function handleRecorded(result: { success: true; message: string } | { success: false; error: string }) {
    if (result.success) {
      setSuccessMessage(result.message);
      setErrorMessage(null);
      setModalOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } else {
      setErrorMessage(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <ServiceHoldAuditSync holds={serviceHolds} />
      {serviceHolds.length > 0 ? (
        <ServiceHoldBanner
          reason={`${serviceHolds.length} customer${serviceHolds.length === 1 ? "" : "s"} on Service Hold. Recording payment that clears all 30+ day overdue invoices automatically restores Active status and allows held visits to be rescheduled.`}
        />
      ) : null}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            Payment dashboard
          </h2>
          <p className="text-sm text-stone-500">
            Snapshot of collections and outstanding balances.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardStatCard
            label="Total Payments This Month"
            value={formatCurrency(summary.collectedThisMonth)}
            hint="Applied collections in the current month"
          />
          <DashboardStatCard
            label="Outstanding Balance"
            value={formatCurrency(summary.outstandingBalance)}
            hint="Open invoice balances remaining"
          />
          <DashboardStatCard
            label="Overdue Customers"
            value={summary.overdueCustomerCount}
            hint="Customers with past-due invoices"
          />
          <DashboardStatCard
            label="Collection Rate"
            value={
              summary.collectionRate === null
                ? "—"
                : `${summary.collectionRate}%`
            }
            hint="Amount paid ÷ total billed"
          />
          <DashboardStatCard
            label="Average Days to Pay"
            value={
              summary.averageDaysToPay === null
                ? "—"
                : `${summary.averageDaysToPay} days`
            }
            hint="Issue date to payment date"
          />
        </div>
      </section>

      <CollectionRiskSection
        rows={collectionRisk}
        heldCustomerIds={heldIds}
        highRiskOnly={highRiskOnly}
      />

      {successMessage ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {successMessage}
        </div>
      ) : null}
      {errorMessage && !modalOpen ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-green-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Record Payment
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-green-950">
              Filter payment history
            </h2>
            <p className="text-xs text-stone-500">
              Narrow the payment table below. This does not record a payment.
            </p>
          </div>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-xs font-medium text-stone-500">
            Customer
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800"
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-stone-500">
            Payment method
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800"
            >
              <option value="">All methods</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-stone-500">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800"
            />
          </label>
          <label className="block text-xs font-medium text-stone-500">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800"
            />
          </label>
          <label className="block text-xs font-medium text-stone-500">
            Payment status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800"
            >
              <option value="">All statuses</option>
              <option value="applied">Applied</option>
              <option value="unapplied">Unapplied</option>
              <option value="void">Void</option>
            </select>
          </label>
        </div>
      </div>

      {filteredPayments.length === 0 ? (
        <EmptyState message="No payments match the current filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Payment date</th>
                <th className="px-4 py-3 font-medium">Payment / Ref #</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const isSelected = selectedPayment?.id === payment.id;
                return (
                  <tr
                    key={payment.id}
                    data-payment-row="true"
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected && panelOpen}
                    aria-label={`View payment details for ${paymentInvoiceNumber(payment)}`}
                    onClick={() => openPaymentPanel(payment)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openPaymentPanel(payment);
                      }
                    }}
                    className={`cursor-pointer border-t border-stone-100 transition-colors outline-none focus-visible:bg-green-50 ${
                      isSelected && panelOpen
                        ? "bg-green-50"
                        : "hover:bg-green-50/60"
                    }`}
                  >
                    <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-3">
                      {payment.reference_number ||
                        payment.payment_number ||
                        "—"}
                    </td>
                    <td className="px-4 py-3">{paymentInvoiceNumber(payment)}</td>
                    <td className="px-4 py-3">{paymentCustomerName(payment)}</td>
                    <td className="px-4 py-3">
                      {paymentMethodLabel(payment.payment_method)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(Number(payment.amount))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status ?? "applied"} />
                    </td>
                    <td className="px-4 py-3">
                      {payment.recorded_by_name || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedPayment ? (
        <PaymentDetailPanel
          payment={selectedPayment}
          open={panelOpen}
          onClose={closePaymentPanel}
          onExited={handlePanelExited}
        />
      ) : null}

      {modalOpen ? (
        <RecordPaymentModal
          customers={customers}
          busy={isPending}
          heldCustomerIds={heldIds}
          onClose={() => setModalOpen(false)}
          onComplete={handleRecorded}
        />
      ) : null}
    </div>
  );
}

function PaymentDetailPanel({
  payment,
  open,
  onClose,
  onExited,
}: {
  payment: Payment;
  open: boolean;
  onClose: () => void;
  onExited: () => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);

  const invoiceTotal = Number(payment.invoices?.total ?? 0);
  const amountPaid = Number(payment.invoices?.amount_paid ?? 0);
  const remaining = Math.max(
    0,
    Math.round((invoiceTotal - amountPaid) * 100) / 100
  );
  const contractTitle = payment.invoices?.contracts?.title ?? "—";
  const reference =
    payment.reference_number || payment.payment_number || "—";
  const notes = payment.notes?.trim() || "—";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // Let payment rows switch the panel without being blocked.
      if (target.closest("[data-payment-row]")) return;
      const panel = panelRef.current;
      if (panel && !panel.contains(target)) {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-40 bg-stone-900/25 transition-opacity duration-200 ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="payment-detail-title"
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.propertyName === "transform" &&
            !open
          ) {
            onExited();
          }
        }}
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl transition-transform duration-200 ease-out ${
          open
            ? "translate-x-0"
            : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="border-b border-stone-200 bg-gradient-to-br from-green-950 to-green-800 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-green-100/80">
                Payment details
              </p>
              <h2
                id="payment-detail-title"
                className="mt-1 text-xl font-semibold"
              >
                {paymentInvoiceNumber(payment)}
              </h2>
              <p className="mt-1 text-sm text-green-100">
                {paymentCustomerName(payment)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-green-50 hover:bg-white/10"
            >
              Close
            </button>
          </div>
          <p className="mt-4 text-3xl font-bold">
            {formatCurrency(Number(payment.amount))}
          </p>
          <div className="mt-3">
            <StatusBadge status={payment.status ?? "applied"} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <dl className="space-y-4">
            <DetailRow label="Invoice Number" value={paymentInvoiceNumber(payment)} />
            <DetailRow label="Customer" value={paymentCustomerName(payment)} />
            <DetailRow label="Contract" value={contractTitle} />
            <DetailRow
              label="Invoice Total"
              value={formatCurrency(invoiceTotal)}
            />
            <DetailRow
              label="Amount Paid"
              value={formatCurrency(amountPaid)}
            />
            <DetailRow
              label="Remaining Balance"
              value={formatCurrency(remaining)}
              emphasize
            />
            <DetailRow
              label="Payment Method"
              value={paymentMethodLabel(payment.payment_method)}
            />
            <DetailRow
              label="Payment Date"
              value={formatDate(payment.payment_date)}
            />
            <DetailRow label="Reference Number" value={reference} />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Payment Status
              </dt>
              <dd className="mt-1.5">
                <StatusBadge status={payment.status ?? "applied"} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Notes
              </dt>
              <dd className="mt-1.5 whitespace-pre-wrap text-sm text-stone-800">
                {notes}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </>
  );
}

function DetailRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd
        className={`text-right text-sm ${
          emphasize ? "font-semibold text-green-900" : "font-medium text-stone-800"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function CollectionRiskSection({
  rows,
  heldCustomerIds,
  highRiskOnly = false,
}: {
  rows: CustomerCollectionRisk[];
  heldCustomerIds: Set<string>;
  highRiskOnly?: boolean;
}) {
  const visibleRows = highRiskOnly
    ? rows.filter((row) => row.risk === "high")
    : rows;

  return (
    <section id="collection-risk" className="scroll-mt-24 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-green-950">Collection Risk</h2>
        <p className="text-sm text-stone-500">
          Customers ranked by overdue exposure, outstanding balance, and each
          account&apos;s own Average Days to Pay from invoice and payment
          history. Service Hold appears when any invoice is 30+ days overdue.
        </p>
        {highRiskOnly ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Showing{" "}
            {visibleRows.length === 1
              ? "1 high collection risk customer"
              : `${visibleRows.length} high collection risk customers`}
            .{" "}
            <a
              href="/payments"
              className="font-medium text-green-800 underline hover:text-green-950"
            >
              Clear filter
            </a>
          </p>
        ) : null}
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState
          message={
            highRiskOnly
              ? "No high collection risk customers right now."
              : "No customer collection risk data available yet."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Outstanding balance</th>
                <th className="px-4 py-3 font-medium">Overdue invoices</th>
                <th className="px-4 py-3 font-medium">Average Days to Pay</th>
                <th className="px-4 py-3 font-medium">Payment behavior</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.customerId}
                  className="border-t border-stone-100"
                >
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {row.customerName}
                  </td>
                  <td className="px-4 py-3">
                    <ServiceHoldBadge
                      onHold={heldCustomerIds.has(row.customerId)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={row.risk} />
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(row.outstandingBalance)}
                  </td>
                  <td className="px-4 py-3">{row.overdueInvoiceCount}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {!row.hasPaymentHistory || row.averageDaysToPay == null
                      ? "No Payment History"
                      : `Average Days to Pay: ${row.averageDaysToPay} Days`}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBehaviorBadge behavior={row.paymentBehavior} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PaymentBehaviorBadge({
  behavior,
}: {
  behavior: PaymentBehavior | null;
}) {
  if (!behavior) {
    return <span className="text-sm text-stone-500">No Payment History</span>;
  }

  const styles: Record<PaymentBehavior, string> = {
    excellent: "bg-green-100 text-green-800 border-green-200",
    on_time: "bg-yellow-100 text-yellow-900 border-yellow-200",
    slow: "bg-orange-100 text-orange-900 border-orange-200",
    high_risk: "bg-red-100 text-red-800 border-red-200",
  };
  const labels: Record<PaymentBehavior, string> = {
    excellent: "🟢 Excellent Payer",
    on_time: "🟡 On-Time Payer",
    slow: "🟠 Slow Payer",
    high_risk: "🔴 High Collection Risk",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[behavior]}`}
    >
      {labels[behavior]}
    </span>
  );
}

function RiskBadge({ level }: { level: CollectionRiskLevel }) {
  const styles: Record<CollectionRiskLevel, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-900",
    high: "bg-red-100 text-red-800",
  };
  const labels: Record<CollectionRiskLevel, string> = {
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}

function DashboardStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-green-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}

function RecordPaymentModal({
  customers,
  busy,
  heldCustomerIds,
  onClose,
  onComplete,
}: {
  customers: CustomerOption[];
  busy: boolean;
  heldCustomerIds: Set<string>;
  onClose: () => void;
  onComplete: (
    result: { success: true; message: string } | { success: false; error: string }
  ) => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [invoices, setInvoices] = useState<OpenInvoice[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("check");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [allowFuture, setAllowFuture] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId);
  const invoiceTotal = selectedInvoice ? Number(selectedInvoice.total) : 0;
  const amountPaid = selectedInvoice ? Number(selectedInvoice.amount_paid) : 0;
  const remaining = Math.round((invoiceTotal - amountPaid) * 100) / 100;

  async function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    setInvoiceId("");
    setAmount("");
    setInvoices([]);
    setFormError(null);
    if (!nextCustomerId) return;

    setLoadingInvoices(true);
    const result = await getOpenInvoicesForCustomer(nextCustomerId);
    setLoadingInvoices(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setInvoices(result.data as OpenInvoice[]);
  }

  function handleInvoiceChange(nextInvoiceId: string) {
    setInvoiceId(nextInvoiceId);
    setFormError(null);
    const invoice = invoices.find((row) => row.id === nextInvoiceId);
    if (invoice) {
      const balance =
        Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100) /
        100;
      setAmount(balance > 0 ? balance.toFixed(2) : "");
    } else {
      setAmount("");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || busy) return;

    setFormError(null);
    const parsedAmount = parseFloat(amount);

    if (!customerId) {
      setFormError("Select a customer.");
      return;
    }
    if (!invoiceId) {
      setFormError("Select an open invoice.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Payment amount must be greater than zero.");
      return;
    }
    if (parsedAmount - remaining > 0.001) {
      setFormError(
        `Payment cannot exceed the remaining balance of ${formatCurrency(remaining)}.`
      );
      return;
    }
    if (method === "check" && !referenceNumber.trim()) {
      setFormError("Check payments require a reference / check number.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (paymentDate > today && !allowFuture) {
      setFormError(
        "Payment date is in the future. Check “Allow future date” to continue."
      );
      return;
    }

    const formData = new FormData();
    formData.set("invoice_id", invoiceId);
    formData.set("amount", parsedAmount.toFixed(2));
    formData.set("payment_method", method);
    formData.set("payment_date", paymentDate);
    formData.set("reference_number", referenceNumber.trim());
    formData.set("notes", notes.trim());
    if (allowFuture) formData.set("allow_future_date", "true");

    setSubmitting(true);
    try {
      const result = await recordPayment(formData);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      onComplete(result);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-payment-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="record-payment-title"
              className="text-xl font-semibold text-green-950"
            >
              Record Payment
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Apply a full or partial payment to an open invoice.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-stone-700">
            Customer
            <select
              required
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">Select customer…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {heldCustomerIds.has(customer.id) ? " (Service Hold)" : ""}
                </option>
              ))}
            </select>
          </label>
          {customerId && heldCustomerIds.has(customerId) ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              This customer is on Service Hold. Paying enough to clear all
              invoices that are 30 or more days overdue will automatically
              restore Active status.
            </div>
          ) : null}

          <label className="block text-sm font-medium text-stone-700">
            Open invoice
            <select
              required
              value={invoiceId}
              disabled={!customerId || loadingInvoices}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-50"
            >
              <option value="">
                {loadingInvoices
                  ? "Loading invoices…"
                  : customerId
                    ? invoices.length
                      ? "Select invoice…"
                      : "No open invoices"
                    : "Select a customer first"}
              </option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} — balance{" "}
                  {formatCurrency(
                    Number(invoice.total) - Number(invoice.amount_paid)
                  )}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3 rounded-lg bg-stone-50 p-3 text-sm">
            <div>
              <p className="text-xs text-stone-500">Invoice total</p>
              <p className="font-medium text-stone-800">
                {selectedInvoice ? formatCurrency(invoiceTotal) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Previously paid</p>
              <p className="font-medium text-stone-800">
                {selectedInvoice ? formatCurrency(amountPaid) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Remaining balance</p>
              <p className="font-medium text-green-900">
                {selectedInvoice ? formatCurrency(remaining) : "—"}
              </p>
            </div>
          </div>

          <label className="block text-sm font-medium text-stone-700">
            Payment amount
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining || undefined}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Payment method
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Payment date
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => {
                setPaymentDate(e.target.value);
                setAllowFuture(false);
              }}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={allowFuture}
              onChange={(e) => setAllowFuture(e.target.checked)}
            />
            Allow future payment date
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Reference / check number
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={method === "check" ? "Required for checks" : "Optional"}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>

          {formError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || busy}
              className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
