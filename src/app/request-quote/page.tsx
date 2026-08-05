import Link from "next/link";
import { redirect } from "next/navigation";
import { requestServiceQuote } from "@/app/actions/support";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { fetchCustomerContractsForSelect } from "@/lib/queries";

export default async function RequestQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
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
  const { data: contracts } =
    await fetchCustomerContractsForSelect(customerId);

  return (
    <AppShell>
      <PageHeader
        title="Request a Quote"
        description="Have something new in mind for your property? Tell us what you're hoping for—we'll put together a quote that fits your needs."
      />

      {params.error === "1" ? (
        <div className="mb-6 max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Please describe the service you&apos;re interested in.
        </div>
      ) : null}

      <Card className="max-w-xl">
        <form action={requestServiceQuote} className="space-y-4">
          <div>
            <label
              htmlFor="service_description"
              className="block text-sm font-medium text-stone-700"
            >
              What service are you interested in?
            </label>
            <input
              id="service_description"
              name="service_description"
              required
              placeholder="e.g. Monthly flower bed refreshes for the main entrance"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="contract_id"
              className="block text-sm font-medium text-stone-700"
            >
              Related contract{" "}
              <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <select
              id="contract_id"
              name="contract_id"
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">No specific contract</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-stone-700"
            >
              Details{" "}
              <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Timeline, budget range, or property area…"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Submit quote request
            </button>
            <Link
              href="/dashboard"
              className="text-sm text-stone-600 hover:text-green-900 hover:underline"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
