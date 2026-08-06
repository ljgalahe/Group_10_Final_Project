import { AppNav } from "@/components/AppNav";
import { ProspectInquiryForm } from "@/app/inquiries/ProspectInquiryForm";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import { redirect } from "next/navigation";

/** Commercial office park / landscaped corporate campus — not residential. */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2400&q=85";

export default async function InquiriesStartPage() {
  await requireAppAccess();
  const role = await getViewRole();
  if (role !== "inquiries") {
    if (role === "operations") {
      redirect("/ops/inquiries");
    }
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen">
      {/* Full-viewport commercial photo */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        aria-hidden
      />
      <div
        className="fixed inset-0 -z-10 bg-green-950/25"
        aria-hidden
      />

      <AppNav />

      {/* Homepage-style hero: photo fills viewport; form + tagline sit on top */}
      <div className="relative flex min-h-[calc(100vh-4.5rem)] flex-col">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-8 px-4 py-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:py-10">
          {/* Services / trust band (left) */}
          <div className="order-2 max-w-xl lg:order-1 lg:max-w-md xl:max-w-lg">
            <div className="rounded-sm bg-green-900/75 px-6 py-5 shadow-lg backdrop-blur-[2px] sm:px-8 sm:py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-200">
                Commercial landscaping
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl xl:text-[2.75rem]">
                Creating beautiful commercial grounds and reliable service
                experiences.
              </h1>
              <p className="mt-3 text-sm text-green-100 sm:text-base">
                Office parks, retail centers, industrial sites, and multifamily
                communities. Mowing, irrigation, seasonal color, and snow.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {[
                  "Mowing",
                  "Irrigation",
                  "Seasonal color",
                  "Snow removal",
                ].map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Floating inquiry card (right) */}
          <div className="order-1 w-full max-w-md shrink-0 lg:order-2">
            <ProspectInquiryForm variant="overlay" />
          </div>
        </div>
      </div>
    </div>
  );
}
