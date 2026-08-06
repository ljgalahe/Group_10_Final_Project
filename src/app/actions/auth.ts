"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  VIEW_CUSTOMER_COOKIE,
  VIEW_ROLE_COOKIE,
} from "@/lib/demo-role";
import type { UserRole } from "@/lib/types";
import { DEMO_CUSTOMER_ID } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { startDemoSession } from "@/lib/auth-access";

export async function switchDemoRole(formData: FormData) {
  const role = formData.get("role") as UserRole;
  const cookieStore = await cookies();
  cookieStore.set(VIEW_ROLE_COOKIE, role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  if (role === "customer") {
    cookieStore.set(VIEW_CUSTOMER_COOKIE, DEMO_CUSTOMER_ID, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    cookieStore.delete(VIEW_CUSTOMER_COOKIE);
  }
  revalidatePath("/", "layout");
  if (role === "inquiries") {
    redirect("/inquiries");
  }
  redirect("/dashboard");
}

export async function signInDemo(): Promise<void> {
  const supabase = await createClient();
  const email = "demo@greenscape.com";
  const password = "Demo123456!";

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: "Demo Manager" } },
    });

    if (!signUpError) {
      await supabase.auth.signInWithPassword({ email, password });
    }
  }

  await startDemoSession("manager");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("greenscape_demo_session");
  redirect("/login");
}
