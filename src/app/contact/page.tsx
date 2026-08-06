import Link from "next/link";
import { redirect } from "next/navigation";
import { submitSupportRequest } from "@/app/actions/support";
import { AppShell } from "@/components/AppShell";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { formatDate } from "@/lib/format";
import {
  fetchCustomerSupportLinkOptions,
  fetchSupportRequestsForCustomer,
} from "@/lib/queries";
import { SUPPORT_CATEGORIES, SUPPORT_FORM_CATEGORIES } from "@/lib/types";

function formatCategoryLabel(category: string) {
  return (
    SUPPORT_CATEGORIES.find((c) => c.value === category)?.label ??
    category.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
  );
}

function formatCreatedDate(iso: string) {
  const day = iso.slice(0, 10);
  return formatDate(day);
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
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
  const { options: linkOptions } =
    await fetchCustomerSupportLinkOptions(customerId);
  const { data: requests } =
    await fetchSupportRequestsForCustomer(customerId);

  return (
    <AppShell>
      <PageHeader
        title="Contact Us"
        description="Send a question, concern, complaint, or billing dispute to GreenScape. Track the status of your past messages below."
      />

      {params.submitted === "1" ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Your message was submitted. We have received your request.
        </div>
      ) : null}

      {params.error === "invalid" ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Please choose a category and enter a message before submitting.
        </div>
      ) : null}

      {params.error && params.error !== "invalid" ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {params.error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Submit a Request
          </h2>
          <form
            action={submitSupportRequest}
            className="mt-4 space-y-4"
            encType="multipart/form-data"
          >
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-stone-700"
              >
                Category
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue=""
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {SUPPORT_FORM_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="linked_record"
                className="block text-sm font-medium text-stone-700"
              >
                Related Record{" "}
                <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <select
                id="linked_record"
                name="linked_record"
                defaultValue=""
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {linkOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-stone-700"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="Describe your question or issue…"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="photo"
                className="block text-sm font-medium text-stone-700"
              >
                Photo of the issue{" "}
                <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-green-900 hover:file:bg-green-100"
              />
              <p className="mt-1 text-xs text-stone-500">
                JPG, PNG, WEBP, or GIF up to 5 MB.
              </p>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Submit Request
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Your Past Requests
          </h2>
          {requests.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="You have not submitted any requests yet." />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-stone-100">
              {requests.map((req) => (
                <li key={req.id}>
                  <Link
                    href={`/contact/${req.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm transition hover:bg-stone-50"
                  >
                    <div>
                      <p className="font-medium text-green-900 hover:underline">
                        {formatCategoryLabel(req.category)}
                      </p>
                      <p className="text-stone-500">
                        {formatCreatedDate(req.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={req.status.toLowerCase()} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
