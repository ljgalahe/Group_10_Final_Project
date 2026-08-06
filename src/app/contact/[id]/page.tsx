import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { formatDate } from "@/lib/format";
import { fetchSupportRequestForCustomer } from "@/lib/queries";
import { supportPhotoPublicUrl } from "@/lib/support-photos";
import { SUPPORT_CATEGORIES } from "@/lib/types";

function formatCategoryLabel(category: string) {
  return (
    SUPPORT_CATEGORIES.find((c) => c.value === category)?.label ??
    category.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
  );
}

function formatCreatedDate(iso: string) {
  return formatDate(iso.slice(0, 10));
}

export default async function ContactRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;
  const { data: request, linked_label } = await fetchSupportRequestForCustomer(
    id,
    customerId
  );

  if (!request) {
    notFound();
  }

  const photoUrl = supportPhotoPublicUrl(
    (request as { photo_path?: string | null }).photo_path
  );

  return (
    <AppShell>
      <PageHeader
        title={formatCategoryLabel(request.category)}
        description={`Submitted ${formatCreatedDate(request.created_at)}`}
        action={<StatusBadge status={request.status.toLowerCase()} />}
      />

      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Your Message
          </h2>
          {linked_label ? (
            <p className="mt-2 text-sm text-stone-500">
              Related: {linked_label}
            </p>
          ) : null}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
            {request.message}
          </p>
          {photoUrl ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-stone-800">Photo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Photo attached to this support request"
                className="mt-2 max-h-80 w-full rounded-lg border border-stone-200 object-contain bg-stone-50"
              />
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">Resolution</h2>
          {request.resolution_notes?.trim() ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
              {request.resolution_notes}
            </p>
          ) : request.status === "Resolved" ? (
            <p className="mt-4 text-sm text-stone-500">
              This request is marked resolved. GreenScape has not posted
              resolution details yet.
            </p>
          ) : (
            <p className="mt-4 text-sm text-stone-500">
              GreenScape is still reviewing this request. Check back for an
              update when the status changes.
            </p>
          )}
          <p className="mt-4 text-xs text-stone-400">
            Current status:{" "}
            <span className="font-medium text-stone-600">{request.status}</span>
          </p>
        </Card>

        <Link
          href="/contact"
          className="inline-block text-sm text-green-800 hover:underline"
        >
          ← Back to Contact Us
        </Link>
      </div>
    </AppShell>
  );
}
