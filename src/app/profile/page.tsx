import { redirect } from "next/navigation";
import {
  updateCustomerContact,
  updateCustomerNotes,
} from "@/app/actions/profile";
import { AppShell } from "@/components/AppShell";
import { ProfileDocumentDownloadButton } from "@/components/customer/ProfileDocumentDownloadButton";
import type { ProfileDocument } from "@/components/customer/ProfileDocumentDownloadButton";
import { ProfileNotifications } from "@/components/customer/ProfileNotifications";
import { ProfilePaymentMethods } from "@/components/customer/ProfilePaymentMethods";
import { CustomerNotesField } from "@/components/customer/CustomerNotesField";
import { ServiceHoldAuditPanel } from "@/components/ServiceHoldAuditPanel";
import {
  ServiceHoldBadge,
  ServiceHoldBanner,
} from "@/components/ServiceHoldBanner";
import { ServiceHoldAuditSync } from "@/components/ServiceHoldDashboardCard";
import { Card, PageHeader } from "@/components/ui";
import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { mergeNotificationPrefs } from "@/lib/customer-payment-methods";
import {
  CUSTOMER_NOTES_HELPER,
} from "@/lib/customer-notes";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { formatDate } from "@/lib/format";
import {
  fetchCustomerPaymentMethods,
  fetchCustomerProfile,
} from "@/lib/queries";
import { buildCustomerServiceHolds } from "@/lib/service-hold";
import { DEMO_CUSTOMER_ID } from "@/lib/types";

const DEMO_DOCUMENTS: ProfileDocument[] = [
  {
    id: "coi-2026",
    title: "Certificate of Insurance",
    description:
      "Proof of commercial general liability, auto, and workers’ compensation coverage for vendor files.",
    issuedOn: "2026-01-15",
    expiresOn: "2026-09-30",
    kind: "coi",
  },
  {
    id: "w9-2026",
    title: "IRS Form W-9",
    description:
      "Taxpayer identification request form for AP / vendor enrollment at your company.",
    issuedOn: "2026-01-10",
    kind: "w9",
  },
  {
    id: "msa-2026",
    title: "2026 Service Agreement (summary PDF)",
    description:
      "Vendor-file summary of your active seasonal grounds maintenance relationship.",
    issuedOn: "2026-04-01",
    kind: "agreement",
  },
];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  if (role !== "customer") {
    redirect("/dashboard");
  }

  const customerId = await getViewCustomerId();
  if (!customerId) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createDataClient();
  const [{ data: customer }, { data: methods }, { data: invoices }] =
    await Promise.all([
      fetchCustomerProfile(customerId),
      fetchCustomerPaymentMethods(customerId),
      supabase
        .from("invoices")
        .select(
          "id, invoice_number, customer_id, total, amount_paid, status, due_date"
        )
        .eq("customer_id", customerId),
    ]);

  if (!customer) {
    redirect("/dashboard");
  }

  const holds = buildCustomerServiceHolds(
    (invoices ?? []).map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: String(invoice.customer_id),
      total: Number(invoice.total),
      amount_paid: Number(invoice.amount_paid),
      status: invoice.status,
      due_date: invoice.due_date,
      customers: { name: customer.name },
    }))
  );
  const customerHold = holds.find((hold) => hold.customerId === customerId);
  const onServiceHold = Boolean(customerHold);

  const email = customer.contact_email ?? "";
  const phone = customer.contact_phone ?? "";
  const prefs = mergeNotificationPrefs(
    customer.notification_prefs,
    email,
    phone
  );

  const showDocuments = customerId === DEMO_CUSTOMER_ID;
  const siteAddress = customer.address ?? "Service property";

  return (
    <AppShell>
      <PageHeader
        title="Profile"
        description="Manage contact details, payment methods, notifications, and vendor documents for your property."
        action={<ServiceHoldBadge onHold={onServiceHold} />}
      />
      <ServiceHoldAuditSync holds={holds} />

      {onServiceHold && customerHold ? (
        <div className="mb-6">
          <ServiceHoldBanner
            customerName={customer.name}
            reason={customerHold.reason}
            daysOverdue={customerHold.daysOverdue}
            oldestInvoiceNumber={customerHold.oldestInvoiceNumber}
          />
        </div>
      ) : null}

      {params.saved === "contact" ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Contact details updated.
        </div>
      ) : null}
      {params.saved === "notes" ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Customer notes updated. GreenScape crews will see these on each visit.
        </div>
      ) : null}
      {params.saved === "payment" ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Payment methods updated.
        </div>
      ) : null}
      {params.saved === "notifications" ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Notification preferences saved.
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          We couldn&apos;t save that change. Check the fields and try again. If
          profile columns are missing, run the latest Supabase migration.
        </div>
      ) : null}

      <div className="space-y-8">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-green-950">Property</h2>
            <ServiceHoldBadge onHold={onServiceHold} />
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Account status</dt>
              <dd className="mt-0.5 font-medium text-green-950">
                {onServiceHold ? "Service Hold" : "Active"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Property name</dt>
              <dd className="mt-0.5 font-medium text-green-950">
                {customer.name}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Property type</dt>
              <dd className="mt-0.5 font-medium text-green-950">
                {customer.property_type ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-500">Service address</dt>
              <dd className="mt-0.5 font-medium text-green-950">
                {customer.address ?? "—"}
              </dd>
            </div>
            {customer.created_at ? (
              <div>
                <dt className="text-stone-500">Customer since</dt>
                <dd className="mt-0.5 font-medium text-green-950">
                  {new Date(customer.created_at).getFullYear()}
                </dd>
              </div>
            ) : null}
          </dl>

          <form
            action={updateCustomerNotes}
            className="mt-6 max-w-2xl space-y-3 border-t border-stone-100 pt-5"
          >
            <div>
              <label
                htmlFor="customer_notes"
                className="block text-sm font-medium text-green-950"
              >
                Customer notes
              </label>
              <p className="mt-1 text-sm text-stone-500">
                {CUSTOMER_NOTES_HELPER}
              </p>
              <CustomerNotesField
                defaultValue={customer.customer_notes}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Save Notes
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Credit hold history
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Automatic Service Hold events when invoices become 30+ days overdue
            or the account is released after payment.
          </p>
          <div className="mt-4">
            <ServiceHoldAuditPanel customerId={customerId} holds={holds} />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Contact details
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Who we should reach for billing questions and site coordination.
          </p>
          <form action={updateCustomerContact} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="contact_name"
                className="block text-sm font-medium text-stone-700"
              >
                Primary contact name
              </label>
              <input
                id="contact_name"
                name="contact_name"
                type="text"
                required
                defaultValue={customer.contact_name ?? ""}
                className="mt-1 w-full max-w-md rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="contact_email"
                className="block text-sm font-medium text-stone-700"
              >
                Email
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                required
                defaultValue={customer.contact_email ?? ""}
                className="mt-1 w-full max-w-md rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="contact_phone"
                className="block text-sm font-medium text-stone-700"
              >
                Phone
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                defaultValue={customer.contact_phone ?? ""}
                placeholder="(662) 555-0142"
                className="mt-1 w-full max-w-md rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Save contact details
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Payment methods
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Cards and bank accounts on file for invoice payments. This is a demo
            vault — we never store full card numbers.
          </p>
          <div className="mt-2">
            <ProfilePaymentMethods methods={methods} />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Notification preferences
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Check a topic to opt in. We&apos;ll ask how to reach you before it
            turns on.
          </p>
          <ProfileNotifications
            prefs={prefs}
            defaultEmail={email}
            defaultPhone={phone}
          />
        </Card>

        {showDocuments ? (
          <Card>
            <h2 className="text-lg font-semibold text-green-950">Documents</h2>
            <p className="mt-1 text-sm text-stone-500">
              Vendor paperwork for {customer.name} — COI, W-9, and service
              agreement for your AP or facilities file.
            </p>
            <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
              {DEMO_DOCUMENTS.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-4"
                >
                  <div className="min-w-0 max-w-xl">
                    <p className="text-sm font-medium text-green-950">
                      {doc.title}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {doc.description}
                    </p>
                    <p className="mt-1.5 text-xs text-stone-400">
                      Issued {formatDate(doc.issuedOn)}
                      {doc.expiresOn
                        ? ` · Expires ${formatDate(doc.expiresOn)}`
                        : ""}
                    </p>
                  </div>
                  <ProfileDocumentDownloadButton
                    document={doc}
                    customerName={customer.name}
                    address={siteAddress}
                  />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
