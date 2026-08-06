import { AppNav } from "@/components/AppNav";
import { NavigationProgress } from "@/components/NavigationProgress";
import { getViewRole, roleIsOpsWorkspace } from "@/lib/demo-role";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const role = await getViewRole();
  const ops = roleIsOpsWorkspace(role);

  return (
    <div className={`gs-canvas min-h-screen ${ops ? "gs-ops" : ""}`}>
      <NavigationProgress />
      <AppNav />
      <div className="md:pl-60">
        <main
          className={`mx-auto max-w-6xl px-5 sm:px-8 ${
            ops ? "py-6 sm:py-7" : "py-8 sm:py-10"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
