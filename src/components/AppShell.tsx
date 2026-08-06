import { AppFrame } from "@/components/AppFrame";
import { NavigationProgress } from "@/components/NavigationProgress";
import { getVisibleNavItems } from "@/lib/app-nav";
import { getViewRole, roleIsOpsWorkspace } from "@/lib/demo-role";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const role = await getViewRole();
  const ops = roleIsOpsWorkspace(role);
  const items = getVisibleNavItems(role);

  return (
    <div className={`gs-canvas min-h-dvh ${ops ? "gs-ops" : ""}`}>
      <NavigationProgress />
      <AppFrame role={role} items={items} ops={ops}>
        {children}
      </AppFrame>
    </div>
  );
}
