import { AppShell } from "@/components/AppShell";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAppAccess();
  const params = await searchParams;

  return (
    <AppShell>
      <PageHeader
        title="Chat"
        description="Announcements for the team, plus direct messages with crew leads and others."
      />
      <ChatWorkspace
        initialWith={first(params.with)}
        initialFrom={first(params.from)}
        initialVisit={first(params.visit)}
        initialJob={first(params.job)}
        initialCompany={first(params.company)}
        initialConcern={first(params.concern)}
        initialThread={first(params.thread)}
      />
    </AppShell>
  );
}
