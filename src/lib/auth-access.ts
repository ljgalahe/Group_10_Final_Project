import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VIEW_ROLE_COOKIE } from "@/lib/demo-role";

export const DEMO_SESSION_COOKIE = "greenscape_demo_session";

export async function hasAppAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_SESSION_COOKIE)?.value === "active") {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

export async function requireAppAccess(): Promise<void> {
  if (await hasAppAccess()) {
    return;
  }

  if (process.env.NEXT_PUBLIC_AUTO_DEMO === "true") {
    redirect("/demo-enter");
  }

  redirect("/login");
}

export async function startDemoSession(role = "manager"): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE, "active", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  cookieStore.set(VIEW_ROLE_COOKIE, role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Ensure demo cookies exist without forcing a role change if already active. */
export async function ensureDemoSession(fallbackRole = "inquiries"): Promise<void> {
  if (await hasAppAccess()) return;
  await startDemoSession(fallbackRole);
}

export async function createDataClient() {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get(DEMO_SESSION_COOKIE)?.value === "active";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    isDemo &&
    serviceKey &&
    serviceKey !== "your_service_role_key_here"
  ) {
    const { createClient: createSupabaseClient } = await import(
      "@supabase/supabase-js"
    );
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );
  }

  return createClient();
}
