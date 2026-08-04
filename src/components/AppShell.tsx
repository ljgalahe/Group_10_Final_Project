import { AppNav } from "@/components/AppNav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
