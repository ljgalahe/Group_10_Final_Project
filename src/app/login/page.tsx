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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-stone-900 px-4">
      <Card className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-green-700">
            GreenScape Commercial
          </p>
          <h1 className="mt-2 text-3xl font-bold text-green-950">
            Contract-to-Cash System
          </h1>
          <p className="mt-3 text-stone-600">
            Commercial landscaping management for contracts, billing, and
            collections.
          </p>
        </div>

        <form action={signInDemo}>
          <button
            type="submit"
            className="w-full rounded-lg bg-green-800 px-4 py-3 font-semibold text-white hover:bg-green-700"
          >
            Enter Demo System
          </button>
        </form>

        <a
          href="/demo-enter"
          className="mt-3 block w-full rounded-lg border border-green-800 px-4 py-3 text-center font-semibold text-green-900 hover:bg-green-50"
        >
          Skip Login — View Demo
        </a>

        <p className="mt-4 text-center text-sm text-stone-500">
          Or go directly to{" "}
          <Link href="/dashboard" className="text-green-800 underline">
            Dashboard
          </Link>{" "}
          after clicking either button above.
        </p>

        <div className="mt-6 rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
          <p className="font-medium text-stone-800">For the presentation panel:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Click Enter Demo System once</li>
            <li>Use the role switcher in the top nav to change views instantly</li>
            <li>No need to log out between Manager, Accountant, Crew Lead, and Customer</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
