import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAppAccess } from "@/lib/auth-access";
import { signInDemo } from "@/app/actions/auth";
import { Card } from "@/components/ui";

export default async function LoginPage() {
  if (await hasAppAccess()) {
    redirect("/dashboard");
  }

  if (process.env.NEXT_PUBLIC_AUTO_DEMO === "true") {
    redirect("/demo-enter");
  }

  return (
    <div className="gs-canvas flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.28em] text-green-800">
          GreenScape Commercial
        </p>
        <Card className="mt-4 border-stone-300/80 bg-[#faf8f4]">
          <div className="mb-8 text-center">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-green-950">
              Contract to Cash
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
              Commercial landscaping management for contracts, billing, and
              collections—polished for the office, built for the field.
            </p>
          </div>

          <form action={signInDemo}>
            <button
              type="submit"
              className="w-full border border-green-900 bg-green-900 px-4 py-3 text-sm font-medium tracking-[0.06em] text-[#faf8f4] transition hover:bg-green-800"
            >
              Enter Demo System →
            </button>
          </form>

          <a
            href="/demo-enter"
            className="mt-3 block w-full border border-stone-300 px-4 py-3 text-center text-sm font-medium tracking-[0.04em] text-green-950 transition hover:border-green-800 hover:bg-green-50"
          >
            Skip Login — View Demo
          </a>

          <p className="mt-5 text-center text-sm text-stone-500">
            Or go directly to{" "}
            <Link href="/dashboard" className="text-green-800 underline-offset-2 hover:underline">
              Dashboard
            </Link>{" "}
            after entering.
          </p>

          <div className="mt-8 border-t border-stone-200 pt-5 text-sm text-stone-600">
            <p className="font-medium text-stone-800">For the presentation panel</p>
            <ul className="mt-2 space-y-1.5 text-stone-500">
              <li>Click Enter Demo System once</li>
              <li>Use View as in the left sidebar to change roles</li>
              <li>All sample data is ready for walkthrough</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
