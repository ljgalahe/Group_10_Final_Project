import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  InvoiceStatusFilter,
  type InvoiceStatusFilterValue,
} from "@/components/InvoiceStatusFilter";
import { InvoicesDashboard } from "@/components/invoices/InvoicesDashboard";
import { buildInvoiceListItem } from "@/app/invoices/lib/build-invoice-list-item";
import { CustomerPayButton } from "@/components/customer/CustomerPayButton";
import { DownloadInvoiceReceiptButton } from "@/components/customer/DownloadInvoiceReceiptButton";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { PostJournalEntryButton } from "@/components/PostJournalEntryButton";
import { requireAppAccess } from "@/lib/auth-access";
import {
  getViewCustomerId,
  getViewRole,
  roleCanManageBilling,
} from "@/lib/demo-role";
import { formatCurrency, formatDate, getDisplayInvoiceStatus } from "@/lib/format";
import {
  invoiceJournalReadyReason,
  type JournalStatus,
} from "@/lib/journal";
import {
  fetchCustomerPaymentMethods,
  fetchInvoice,
  fetchInvoices,
  fetchJournalSourceStates,
} from "@/lib/queries";
import { getOutstandingBalance } from "@/app/invoices/lib/accounting";
import { InvoiceStatusBadge } from "@/app/invoices/components/InvoiceStatusBadge";
import { AddInvoiceButton } from "@/app/invoices/components/AddInvoiceButton";
import { AccountantPaymentsSection } from "@/app/invoices/components/AccountantPaymentsSection";
import { fetchContractsForInvoice } from "@/app/invoices/queries";
import { fetchPaymentsForAccountant } from "@/app/payments/queries";

async function CustomerReceiptCell({
  invoiceId,
  amountPaid,
}: {
  invoiceId: string;
  amountPaid: number;
}) {
  if (amountPaid <= 0) {
    return <span className="text-stone-400">—</span>;
  }

  const { data: invoice } = await fetchInvoice(invoiceId);
  if (!invoice) {
    return <span className="text-stone-400">—</span>;
  }

  const lines = (invoice.invoice_lines ?? []) as {
    description: string;
    amount: number;
    line_type: string | null;
  }[];
  const payments = (invoice.payments ?? []) as {
    amount: number;
    payment_date: string;
    payment_method: string;
  }[];
  const balance = Number(invoice.total) - Number(invoice.amount_paid);

  return (
    <DownloadInvoiceReceiptButton
      data={{
        invoiceNumber: invoice.invoice_number,
        customerName: (invoice.customers as { name: string }).name,
        contractTitle: (invoice.contracts as { title: string }).title,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        total: Number(invoice.total),
        amountPaid: Number(invoice.amount_paid),
        balance,
        lines: lines.map((line) => ({
          description: line.description,
          amount: Number(line.amount),
          line_type: line.line_type,
        })),
        payments: payments.map((payment) => ({
          amount: Number(payment.amount),
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
        })),
      }}
      label="Download PDF"
      className="rounded-md border border-green-800 px-2.5 py-1 text-xs font-medium text-green-900 hover:bg-green-50"
    />
  );
}

function parseStatusFilter(raw?: string): InvoiceStatusFilterValue {
  if (raw === "paid" || raw === "all") return raw;
  return "due";
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; company?: string; due?: string }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  if (role === "crew_member") redirect("/dashboard");
  const isCustomer = role === "customer";
  const isAccountant = role === "accountant";
  const showAccountantLayout = roleCanManageBilling(role);
  const params = await searchParams;
  const dueSoonOnly = params.due === "soon";
  const statusFilter = dueSoonOnly
    ? "due"
    : parseStatusFilter(params.status);
  const companyFilter = params.company?.trim() || "overall";
  const dashboardStatus =
    params.status === "overdue" ||
    params.status === "paid" ||
    params.status === "sent" ||
    params.status === "not_sent" ||
    params.status === "all"
      ? params.status
      : "all";
  const [{ data: invoices }, journalStates, contracts, accountantPaymentsResult] =
    await Promise.all([
      fetchInvoices(),
      showAccountantLayout || isAccountant
        ? fetchJournalSourceStates()
        : Promise.resolve(null),
      isAccountant
        ? fetchContractsForInvoice()
        : Promise.resolve(
            [] as Awaited<ReturnType<typeof fetchContractsForInvoice>>
          ),
      isAccountant
        ? fetchPaymentsForAccountant()
        : Promise.resolve({ data: [] as Awaited<
            ReturnType<typeof fetchPaymentsForAccountant>
          >["data"] }),
    ]);
  const invoiceJournalStates =
    journalStates?.invoice ?? new Map<string, JournalStatus | null>();
  const paymentJournalStates =
    journalStates?.payment ?? new Map<string, JournalStatus | null>();
  const accountantPayments = accountantPaymentsResult.data;
  const customerId = isCustomer ? await getViewCustomerId() : null;
  const paymentMethods =
    customerId != null
      ? (await fetchCustomerPaymentMethods(customerId)).data
      : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isPastDue(dueDate: string, balance: number) {
    if (balance <= 0.001) return false;
    return new Date(dueDate + "T00:00:00") < today;
  }

  function daysUntilDue(dueDate: string) {
    const due = new Date(dueDate + "T00:00:00");
    return Math.floor(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Accountant: classic invoice table + payments section (pre-InvoicesDashboard).
  if (isAccountant) {
    const asOfDate = new Date().toISOString().slice(0, 10);
    const filteredInvoices = invoices
      .filter((invoice) => {
        const balance = Number(invoice.total) - Number(invoice.amount_paid);
        if (statusFilter === "due") {
          if (balance <= 0.001) return false;
        } else if (statusFilter === "paid") {
          if (balance > 0.001) return false;
        }
        if (dueSoonOnly) {
          const until = daysUntilDue(invoice.due_date);
          return until >= 0 && until <= 7;
        }
        return true;
      })
      .sort((a, b) => {
        const balA = Number(a.total) - Number(a.amount_paid);
        const balB = Number(b.total) - Number(b.amount_paid);
        const pastA = isPastDue(a.due_date, balA) ? 0 : 1;
        const pastB = isPastDue(b.due_date, balB) ? 0 : 1;
        if (pastA !== pastB) return pastA - pastB;
        if (balA > 0.001 || balB > 0.001) {
          return a.due_date.localeCompare(b.due_date);
        }
        return b.issue_date.localeCompare(a.issue_date);
      });

    const emptyMessage = dueSoonOnly
      ? "No open invoices are due within the next 7 days."
      : statusFilter === "due"
        ? "No open invoices. Switch to Paid or All invoices to see the rest."
        : statusFilter === "paid"
          ? "No fully paid invoices found."
          : "No invoices yet. Generate one from a contract detail page.";

    return (
      <AppShell>
        <PageHeader
          kicker="Ledger"
          title="Invoices"
          description="Bills from contract terms and approved extra work."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <InvoiceStatusFilter value={statusFilter} />
              <AddInvoiceButton contracts={contracts} />
            </div>
          }
        />

        {dueSoonOnly ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Showing{" "}
            {filteredInvoices.length === 1
              ? "1 open invoice"
              : `${filteredInvoices.length} open invoices`}{" "}
            due within 7 days.{" "}
            <a
              href="/invoices"
              className="font-medium text-green-800 underline hover:text-green-950"
            >
              Clear filter
            </a>
          </div>
        ) : null}

        {filteredInvoices.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Contract</th>
                  <th className="px-4 py-3 font-medium">Issue Date</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Outstanding Balance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Journal</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const balance = getOutstandingBalance(
                    Number(invoice.total),
                    Number(invoice.amount_paid)
                  );
                  return (
                    <tr key={invoice.id} className="border-t border-stone-100">
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium text-green-800 hover:underline"
                        >
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {(invoice.customers as { name: string } | null)?.name}
                      </td>
                      <td className="px-4 py-3">
                        {(invoice.contracts as { title: string } | null)?.title}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(invoice.issue_date)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(Number(invoice.total))}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(balance)}</td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge
                          invoice={invoice}
                          asOfDate={asOfDate}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <PostJournalEntryButton
                          source="invoice"
                          sourceId={invoice.id}
                          journalStatus={
                            invoiceJournalStates.get(invoice.id) ?? null
                          }
                          disabledReason={
                            invoiceJournalReadyReason(invoice.status) ??
                            undefined
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <AccountantPaymentsSection
          payments={accountantPayments}
          paymentJournalStates={paymentJournalStates}
        />
      </AppShell>
    );
  }

  // Manager: company filter + status + circle tracker
  if (!isCustomer) {
    const asOfDate = new Date().toISOString().slice(0, 10);
    const listItems = invoices.map((invoice) =>
      buildInvoiceListItem(
        {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          total: invoice.total,
          amount_paid: invoice.amount_paid,
          status: invoice.status,
          customers: invoice.customers as { name?: string } | null,
          contracts: invoice.contracts as { title?: string } | null,
        },
        asOfDate
      )
    );

    const journalRecord: Record<string, JournalStatus | null> = {};
    for (const [id, status] of invoiceJournalStates.entries()) {
      journalRecord[id] = status;
    }

    return (
      <AppShell>
        <PageHeader
          kicker="Ledger"
          title="Invoices"
          description="Invoices from contract terms and approved extra work. Filter by company and status."
        />

        {listItems.length === 0 ? (
          <EmptyState message="No invoices to review yet." />
        ) : (
          <InvoicesDashboard
            invoices={listItems}
            asOfDate={asOfDate}
            journalStates={journalRecord}
            showJournal={showAccountantLayout}
            isAccountant={false}
            initialCompany={companyFilter}
            initialStatus={dashboardStatus}
          />
        )}
      </AppShell>
    );
  }

  const filteredInvoices = invoices
    .filter((invoice) => {
      const balance = Number(invoice.total) - Number(invoice.amount_paid);
      if (statusFilter === "due") return balance > 0.001;
      if (statusFilter === "paid") return balance <= 0.001;
      return true;
    })
    .sort((a, b) => {
      const balA = Number(a.total) - Number(a.amount_paid);
      const balB = Number(b.total) - Number(b.amount_paid);
      const pastA = isPastDue(a.due_date, balA) ? 0 : 1;
      const pastB = isPastDue(b.due_date, balB) ? 0 : 1;
      if (pastA !== pastB) return pastA - pastB;
      if (balA > 0.001 || balB > 0.001) {
        return a.due_date.localeCompare(b.due_date);
      }
      return b.issue_date.localeCompare(a.issue_date);
    });

  const emptyMessage =
    statusFilter === "due"
      ? "No open invoices right now. Switch to Paid to see settled bills."
      : statusFilter === "paid"
        ? "No paid invoices yet."
        : "No invoices for your account yet.";

  return (
    <AppShell>
      <PageHeader
        title="Invoices"
        description="Your bills from GreenScape. Pay open invoices, review payment history, and download PDF receipts after payment."
        action={<InvoiceStatusFilter value={statusFilter} />}
      />

      {filteredInvoices.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Issue Date</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const balance = getOutstandingBalance(
                  Number(invoice.total),
                  Number(invoice.amount_paid)
                );
                const amountPaid = Number(invoice.amount_paid);
                return (
                  <tr key={invoice.id} className="border-t border-stone-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-green-800 hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {(invoice.contracts as { title: string } | null)?.title}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(invoice.issue_date)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(Number(invoice.total))}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(balance)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={getDisplayInvoiceStatus(
                          invoice.status,
                          invoice.due_date,
                          balance,
                          amountPaid,
                          true
                        )}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {balance > 0 ? (
                          <CustomerPayButton
                            invoiceId={invoice.id}
                            invoiceNumber={invoice.invoice_number}
                            amountDue={balance}
                            dueDate={invoice.due_date}
                            paymentMethods={paymentMethods}
                            className="rounded-md bg-green-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                          />
                        ) : null}
                        <CustomerReceiptCell
                          invoiceId={invoice.id}
                          amountPaid={amountPaid}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
