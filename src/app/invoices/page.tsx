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
import { requireAppAccess } from "@/lib/auth-access";
import {
  getViewCustomerId,
  getViewRole,
  roleCanManageBilling,
} from "@/lib/demo-role";
import { formatCurrency, formatDate, getDisplayInvoiceStatus } from "@/lib/format";
import type { JournalStatus } from "@/lib/journal";
import {
  fetchCustomerPaymentMethods,
  fetchInvoice,
  fetchInvoices,
  fetchJournalSourceStates,
} from "@/lib/queries";
import { getOutstandingBalance } from "@/app/invoices/lib/accounting";
import { AddInvoiceButton } from "@/app/invoices/components/AddInvoiceButton";
import { fetchContractsForInvoice } from "@/app/invoices/queries";

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
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  if (role === "crew_member") redirect("/dashboard");
  const isCustomer = role === "customer";
  const isAccountant = role === "accountant";
  const showAccountantLayout = roleCanManageBilling(role);
  const params = await searchParams;
  const statusFilter = parseStatusFilter(params.status);
  const [{ data: invoices }, journalStates, contracts] = await Promise.all([
    fetchInvoices(),
    showAccountantLayout
      ? fetchJournalSourceStates()
      : Promise.resolve(null),
    isAccountant
      ? fetchContractsForInvoice()
      : Promise.resolve(
          [] as Awaited<ReturnType<typeof fetchContractsForInvoice>>
        ),
  ]);
  const invoiceJournalStates =
    journalStates?.invoice ?? new Map<string, JournalStatus | null>();
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

  // Manager / accountant: company filter + status + circle tracker
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
          description={
            role === "manager"
              ? "Invoices from contract terms and approved extra work. Filter by company and status."
              : "Bills from contract terms and approved extra work."
          }
          action={
            isAccountant ? <AddInvoiceButton contracts={contracts} /> : null
          }
        />

        {listItems.length === 0 ? (
          <EmptyState
            message={
              role === "manager"
                ? "No invoices to review yet."
                : "No invoices yet. Generate one from a contract detail page."
            }
          />
        ) : (
          <InvoicesDashboard
            invoices={listItems}
            asOfDate={asOfDate}
            journalStates={journalRecord}
            showJournal={showAccountantLayout}
            isAccountant={isAccountant}
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
                          amountPaid
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
