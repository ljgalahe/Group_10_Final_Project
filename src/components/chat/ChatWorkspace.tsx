"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import {
  CHAT_PEOPLE,
  categoryEmoji,
  categoryLabel,
  createAnnouncement,
  loadChatThreads,
  personById,
  postChatMessage,
  upsertDirectThread,
  type ChatCategory,
  type ChatThread,
} from "@/lib/chat-demo";

type TabFilter = "all" | "announcement" | "direct" | "fyi" | "question";

function Avatar({
  initials,
  size = "md",
}: {
  initials: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-green-800 font-semibold text-white ${dim}`}
    >
      {initials}
    </span>
  );
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ChatWorkspace({
  initialWith,
  initialVisit,
  initialJob,
  initialCompany,
  initialConcern,
}: {
  initialWith?: string;
  initialVisit?: string;
  initialJob?: string;
  initialCompany?: string;
  initialConcern?: string;
}) {
  const router = useRouter();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [filter, setFilter] = useState<TabFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeCategory, setComposeCategory] =
    useState<Exclude<ChatCategory, "direct">>("announcement");
  const [dmOpen, setDmOpen] = useState(false);
  const [dmPersonId, setDmPersonId] = useState("alex-rivera");

  function refresh() {
    setThreads(loadChatThreads());
  }

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("storage", onUpdate);
    window.addEventListener("greenscape-chat-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("greenscape-chat-updated", onUpdate);
    };
  }, []);

  // Deep-link from concern review → open / create DM with crew lead
  useEffect(() => {
    if (!initialWith) return;
    const thread = upsertDirectThread({
      withPersonId: initialWith,
      visitId: initialVisit,
      jobLabel: initialJob,
      companyName: initialCompany,
      concernLabel: initialConcern,
      seedMessage: initialConcern
        ? `Hi — reviewing a field concern on ${initialCompany ?? "this site"} (${initialJob ?? "visit"}):\n\n${initialConcern}\n\nCan you confirm status and next steps?`
        : undefined,
    });
    setThreads(loadChatThreads());
    setFilter("direct");
    setSelectedId(thread.id);
    // Clear query params so refreshing doesn't re-seed the same message
    router.replace("/chat");
  }, [
    initialWith,
    initialVisit,
    initialJob,
    initialCompany,
    initialConcern,
    router,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (filter === "announcement" && t.category !== "announcement") return false;
      if (filter === "direct" && t.category !== "direct") return false;
      if (filter === "fyi" && t.category !== "fyi") return false;
      if (filter === "question" && t.category !== "question") return false;
      if (!q) return true;
      const author = personById(t.authorId)?.name ?? "";
      return (
        t.title.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q) ||
        author.toLowerCase().includes(q)
      );
    });
  }, [threads, filter, query]);

  const selected =
    threads.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (selected && selectedId !== selected.id) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  function sendMessage() {
    if (!selected) return;
    const next = postChatMessage(selected.id, "manager", draft);
    if (next) {
      setDraft("");
      refresh();
      setSelectedId(next.id);
    }
  }

  function publishAnnouncement() {
    if (!composeBody.trim()) return;
    const thread = createAnnouncement({
      title: composeTitle,
      body: composeBody,
      category: composeCategory,
    });
    setComposeOpen(false);
    setComposeTitle("");
    setComposeBody("");
    refresh();
    setFilter(composeCategory === "announcement" ? "announcement" : "all");
    setSelectedId(thread.id);
  }

  function startDm() {
    const thread = upsertDirectThread({ withPersonId: dmPersonId });
    setDmOpen(false);
    refresh();
    setFilter("direct");
    setSelectedId(thread.id);
  }

  const boardThreads = filtered.filter((t) => t.category !== "direct");
  const directThreads = filtered.filter((t) => t.category === "direct");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          + New message
        </button>
        <button
          type="button"
          onClick={() => setDmOpen(true)}
          className="rounded-md border border-green-800 px-3 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
        >
          Direct chat
        </button>
        {(
          [
            ["all", "All messages"],
            ["announcement", "Announcements"],
            ["direct", "Direct"],
            ["fyi", "FYI"],
            ["question", "Questions"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-md px-3 py-2 text-sm ${
              filter === value
                ? "bg-green-100 font-medium text-green-950"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {label}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…"
          className="ml-auto min-w-[10rem] flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      {composeOpen ? (
        <Card className="border-green-200">
          <h3 className="text-base font-semibold text-green-950">
            New board message
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">
                Category
              </span>
              <select
                value={composeCategory}
                onChange={(e) =>
                  setComposeCategory(
                    e.target.value as Exclude<ChatCategory, "direct">
                  )
                }
                className="w-full rounded-md border border-stone-300 px-3 py-2"
              >
                <option value="announcement">📢 Announcement</option>
                <option value="fyi">✨ FYI</option>
                <option value="question">👋 Question</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">
                Title
              </span>
              <input
                value={composeTitle}
                onChange={(e) => setComposeTitle(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2"
                placeholder="Subject"
              />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Message
            </span>
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-stone-300 px-3 py-2"
              placeholder="Write an announcement or update…"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={publishAnnouncement}
              className="rounded-md bg-green-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Post
            </button>
            <button
              type="button"
              onClick={() => setComposeOpen(false)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700"
            >
              Cancel
            </button>
          </div>
        </Card>
      ) : null}

      {dmOpen ? (
        <Card className="border-green-200">
          <h3 className="text-base font-semibold text-green-950">
            Start a direct chat
          </h3>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Person
            </span>
            <select
              value={dmPersonId}
              onChange={(e) => setDmPersonId(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2"
            >
              {CHAT_PEOPLE.filter((p) => p.id !== "manager").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startDm}
              className="rounded-md bg-green-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Open chat
            </button>
            <button
              type="button"
              onClick={() => setDmOpen(false)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700"
            >
              Cancel
            </button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="min-h-[28rem] !p-0 overflow-hidden">
          <div className="border-b border-stone-100 px-4 py-3">
            <h2 className="font-serif text-lg font-semibold text-green-950">
              Message board
            </h2>
            <p className="text-xs text-stone-500">
              Announcements and team updates
            </p>
          </div>
          <ul className="max-h-[32rem] divide-y divide-stone-100 overflow-y-auto">
            {(filter === "direct" ? directThreads : boardThreads).length ===
            0 ? (
              <li className="px-4 py-8 text-center text-sm text-stone-500">
                No messages in this view.
              </li>
            ) : (
              (filter === "direct" ? directThreads : boardThreads).map(
                (thread) => {
                  const author = personById(thread.authorId);
                  const active = selected?.id === thread.id;
                  return (
                    <li key={thread.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(thread.id)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                          active ? "bg-green-50" : "hover:bg-stone-50"
                        }`}
                      >
                        <Avatar
                          initials={
                            thread.category === "direct"
                              ? personById(
                                  thread.participantIds.find(
                                    (id) => id !== "manager"
                                  ) ?? thread.authorId
                                )?.initials ?? "?"
                              : author?.initials ?? "?"
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-green-950">
                              {thread.category !== "direct"
                                ? `${categoryEmoji(thread.category)} `
                                : ""}
                              {thread.title}
                            </p>
                            {thread.unread ? (
                              <span className="rounded-full bg-sky-600 px-1.5 text-[10px] font-semibold text-white">
                                {thread.unread}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {author?.name ?? "Unknown"} ·{" "}
                            {formatWhen(thread.updatedAt)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                            {thread.preview}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                }
              )
            )}
          </ul>

          {filter !== "direct" ? (
            <>
              <div className="border-t border-stone-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-green-950">
                  Direct chats
                </h3>
              </div>
              <ul className="max-h-48 divide-y divide-stone-100 overflow-y-auto border-t border-stone-50">
                {directThreads.length === 0 ? (
                  <li className="px-4 py-4 text-sm text-stone-500">
                    No direct chats yet.
                  </li>
                ) : (
                  directThreads.map((thread) => {
                    const otherId =
                      thread.participantIds.find((id) => id !== "manager") ??
                      thread.authorId;
                    const other = personById(otherId);
                    const active = selected?.id === thread.id;
                    return (
                      <li key={thread.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setFilter("direct");
                            setSelectedId(thread.id);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                            active ? "bg-green-50" : "hover:bg-stone-50"
                          }`}
                        >
                          <Avatar initials={other?.initials ?? "?"} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-green-950">
                              {other?.name ?? thread.title}
                            </p>
                            <p className="truncate text-xs text-stone-500">
                              {thread.preview}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          ) : null}
        </Card>

        <Card className="flex min-h-[28rem] flex-col">
          {selected ? (
            <>
              <div className="border-b border-stone-100 pb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  {categoryLabel(selected.category)}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-green-950">
                  {selected.title}
                </h3>
                {selected.companyName || selected.jobLabel ? (
                  <p className="mt-1 text-sm text-stone-500">
                    {[selected.companyName, selected.jobLabel]
                      .filter(Boolean)
                      .join(" · ")}
                    {selected.visitId
                      ? ` · visit ${selected.visitId.slice(0, 8)}…`
                      : ""}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
                {selected.messages.map((msg) => {
                  const author = personById(msg.authorId);
                  const mine = msg.authorId === "manager";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${mine ? "justify-end" : ""}`}
                    >
                      {!mine ? (
                        <Avatar initials={author?.initials ?? "?"} size="sm" />
                      ) : null}
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          mine
                            ? "bg-green-800 text-white"
                            : "bg-stone-100 text-stone-800"
                        }`}
                      >
                        <p
                          className={`text-[10px] font-semibold ${
                            mine ? "text-green-100" : "text-stone-500"
                          }`}
                        >
                          {author?.name ?? "Unknown"} ·{" "}
                          {new Date(msg.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex gap-2 border-t border-stone-100 pt-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    selected.category === "direct"
                      ? "Write a reply…"
                      : "Add a follow-up…"
                  }
                  className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <p className="m-auto text-sm text-stone-500">
              Select a message or start a direct chat.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
