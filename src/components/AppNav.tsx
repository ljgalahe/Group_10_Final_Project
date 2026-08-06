import { AppSidebar, SidebarProvider } from "@/components/AppSidebar";
import { getVisibleNavItems } from "@/lib/app-nav";
import { getViewRole } from "@/lib/demo-role";

/** Standalone sidebar for pages that don't use AppShell (e.g. inquiries hero). */
export async function AppNav() {
  const role = await getViewRole();
  const items = getVisibleNavItems(role);

  return (
    <SidebarProvider>
      <AppSidebar role={role} items={items} />
    </SidebarProvider>
  );
}
