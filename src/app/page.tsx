import { redirect } from "next/navigation";
import { hasAppAccess } from "@/lib/auth-access";

export default async function Home() {
  if (await hasAppAccess()) {
    redirect("/dashboard");
  }
  redirect("/demo-enter");
}
