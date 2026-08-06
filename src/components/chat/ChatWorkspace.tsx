"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import {
  CHAT_PEOPLE,
  DEFAULT_CREW_LEAD_PERSON_ID,
  categoryEmoji,
  categoryLabel,
  createAnnouncement,
  createGroupThread,
  loadChatThreads,
  personById,
  postChatMessage,
  upsertDirectThread,
  type ChatCategory,
  type ChatThread,
} from "@/lib/chat-demo";

type TabFilter =
  | "all"
  | "announcement"
  | "direct"
  | "group"
  | "fyi"
  | "question";

/** Must match VIEW_ROLE_COOKIE in demo-role.ts (avoid importing that server module here). */
const VIEW_ROLE_COOKIE = "greenscape_view_role";

function clientChatAuthorId(): string {
  if (typeof document === "undefined") return "manager";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${VIEW_ROLE_COOKIE}=([^;]*)`)
  );
  const role = match ? decodeURIComponent(match[1]) : "manager";
  if (role === "crew_lead") return DEFAULT_CREW_LEAD_PERSON_ID;
  if (role === "crew_member") return "jordan-lee";
  if (role === "accountant") return "accountant";
  return "manager";
}

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
  initialFrom,
  initialVisit,
  initialJob,
  initialCompany,
  initialConcern,
  initialThread,
}: {
  initialWith?: string;
  initialFrom?: string;
  initialVisit?: string;
  initialJob?: string;
  initialCompany?: string;
  initialConcern?: string;
  initialThread?: string;
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
    useState<Exclude<ChatCategory, "direct" | "group">>("announcement");
  const [dmOpen, setDmOpen] = useState(false);
  const [dmPersonId, setDmPersonId] = useState("alex-rivera");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [groupError, setGroupError] = useState("");
  const [selfId, setSelfId] = useState("manager");

  function refresh() {
    setThreads(loadChatThreads());
  }

  useEffect(() => {
    const authorId = clientChatAuthorId();
    setSelfId(authorId);
    if (authorId !== "manager") {
      setDmPersonId("manager");
    }
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("storage", onUpdate);
    window.addEventListener("greenscape-chat-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("greenscape-chat-updated", onUpdate);
    };
  }, []);

  // Deep-link → open / create DM (manager↔crew lead, either direction)
  useEffect(() => {
    if (!initialWith) return;
    const fromId = initialFrom ?? clientChatAuthorId();
    const seededByCrewLead =
      fromId !== "manager" && initialWith === "manager" && Boolean(initialConcern);
    const thread = upsertDirectThread({
      withPersonId: initialWith,
      fromPersonId: fromId,
      visitId: initialVisit,
      jobLabel: initialJob,
      companyName: initialCompany,
      concernLabel: initialConcern,
      seedMessage: seededByCrewLead
        ? initialConcern
        : initialConcern
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
    initialFrom,
    initialVisit,
    initialJob,
    initialCompany,
    initialConcern,
    router,
  ]);

  // Deep-link → open an existing thread (e.g. Ops reschedule notify)
  useEffect(() => {
    if (!initialThread || initialWith) return;
    refresh();
    const exists = loadChatThreads().some((t) => t.id === initialThread);
    if (!exists) return;
    setFilter("group");
    setSelectedId(initialThread);
    router.replace("/chat");
  }, [initialThread, initialWith, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (filter === "announcement" && t.category !== "announcement") return false;
      if (filter === "direct" && t.category !== "direct") return false;
      if (filter === "group" && t.category !== "group") return false;
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
    const next = postChatMessage(selected.id, selfId, draft);
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
      authorId: selfId,
    });
    setComposeOpen(false);
    setComposeTitle("");
    setComposeBody("");
    refresh();
    setFilter(composeCategory === "announcement" ? "announcement" : "all");
    setSelectedId(thread.id);
  }

  function startDm() {
    const thread = upsertDirectThread({
      withPersonId: dmPersonId,
      fromPersonId: selfId,
    });
    setDmOpen(false);
    refresh();
    setFilter("direct");
    setSelectedId(thread.id);
  }

  function toggleGroupMember(id: string) {
    setGroupMemberIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
    setGroupError("");
  }

  function startGroup() {
    if (groupMemberIds.length < 1) {
      setGroupError("Select at least one other person.");
      return;
    }
    try {
      const thread = createGroupThread({
        title: groupTitle,
        memberIds: groupMemberIds,
        fromPersonId: selfId,
      });
      setGroupOpen(false);
      setGroupTitle("");
      setGroupMemberIds([]);
      setGroupError("");
      refresh();
      setFilter("group");
      setSelectedId(thread.id);
    } catch (err) {
      setGroupError(
        err instanceof Error ? err.message : "Could not create group chat."
      );
    }
  }

  const boardThreads = filtered.filter(
    (t) => t.category !== "direct" && t.category !== "group"
  );
  const directThreads = filtered.filter((t) => t.category === "direct");
  const groupThreads = filtered.filter((t) => t.category === "group");

  const listThreads =
    filter === "direct"
      ? directThreads
      : filter === "group"
        ? groupThreads
        : boardThreads;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setComposeOpen(true);
            setDmOpen(false);
            setGroupOpen(false);
          }}
          className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          + New message
        </button>
        <button
          type="button"
          onClick={() => {
            setDmOpen(true);
            setGroupOpen(false);
            setComposeOpen(false);
          }}
          className="rounded-md border border-green-800 px-3 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
        >
          Direct chat
        </button>
        <button
          type="button"
          onClick={() => {
            setGroupOpen(true);
            setDmOpen(false);
            setComposeOpen(false);
            setGroupError("");
          }}
          className="rounded-md border border-green-800 px-3 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
        >
          Group chat
        </button>
        {(
          [
            ["all", "All messages"],
            ["announcement", "Announcements"],
            ["direct", "Direct"],
            ["group", "Groups"],
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
                    e.target.value as Exclude<ChatCategory, "direct" | "group">
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
              {CHAT_PEOPLE.filter((p) => p.id !== selfId).map((p) => (
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

      {groupOpen ? (
        <Card className="border-green-200">
          <h3 className="text-base font-semibold text-green-950">
            Start a group chat
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            Name the group and pick who should be in it.
          </p>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Group name
            </span>
            <input
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2"
              placeholder="e.g. Ops · Crew leads"
            />
          </label>
          <fieldset className="mt-3">
            <legend className="mb-2 text-sm font-medium text-stone-700">
              Members
            </legend>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-stone-200 p-3">
              {CHAT_PEOPLE.filter((p) => p.id !== selfId).map((p) => {
                const checked = groupMemberIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroupMember(p.id)}
                        className="h-4 w-4 accent-green-800"
                      />
                      <span>
                        {p.name}
                        <span className="text-stone-500"> · {p.role}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          {groupError ? (
            <p className="mt-2 text-sm text-red-700">{groupError}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startGroup}
              className="rounded-md bg-green-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Create group
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupOpen(false);
                setGroupError("");
              }}
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
              {filter === "direct"
                ? "Direct chats"
                : filter === "group"
                  ? "Group chats"
                  : "Message board"}
            </h2>
            <p className="text-xs text-stone-500">
              {filter === "direct"
                ? "One-to-one conversations"
                : filter === "group"
                  ? "Named chats with multiple people"
                  : "Announcements and team updates"}
            </p>
          </div>
          <ul className="max-h-[32rem] divide-y divide-stone-100 overflow-y-auto">
            {listThreads.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-stone-500">
                No messages in this view.
              </li>
            ) : (
              listThreads.map((thread) => {
                  const author = personById(thread.authorId);
                  const active = selected?.id === thread.id;
                  const isGroup = thread.category === "group";
                  const isDirect = thread.category === "direct";
                  const otherId =
                    thread.participantIds.find((id) => id !== selfId) ??
                    thread.authorId;
                  const avatarInitials = isDirect
                    ? personById(otherId)?.initials ?? "?"
                    : isGroup
                      ? "G"
                      : author?.initials ?? "?";
                  return (
                    <li key={thread.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(thread.id)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                          active ? "bg-green-50" : "hover:bg-stone-50"
                        }`}
                      >
                        <Avatar initials={avatarInitials} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-green-950">
                              {!isDirect
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
                            {isGroup
                              ? `${thread.participantIds.length} members`
                              : author?.name ?? "Unknown"}{" "}
                            · {formatWhen(thread.updatedAt)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                            {thread.preview}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })
            )}
          </ul>

          {filter !== "direct" && filter !== "group" ? (
            <>
              <div className="border-t border-stone-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-green-950">
                  Group chats
                </h3>
              </div>
              <ul className="max-h-40 divide-y divide-stone-100 overflow-y-auto border-t border-stone-50">
                {groupThreads.length === 0 ? (
                  <li className="px-4 py-4 text-sm text-stone-500">
                    No group chats yet. Use Group chat to start one.
                  </li>
                ) : (
                  groupThreads.map((thread) => {
                    const active = selected?.id === thread.id;
                    return (
                      <li key={thread.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setFilter("group");
                            setSelectedId(thread.id);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                            active ? "bg-green-50" : "hover:bg-stone-50"
                          }`}
                        >
                          <Avatar initials="G" size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-green-950">
                              {thread.title}
                            </p>
                            <p className="truncate text-xs text-stone-500">
                              {thread.participantIds.length} members ·{" "}
                              {thread.preview}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

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
                      thread.participantIds.find((id) => id !== selfId) ??
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
                {selected.category === "group" ? (
                  <p className="mt-1 text-sm text-stone-600">
                    {selected.participantIds
                      .map((id) => personById(id)?.name ?? id)
                      .join(" · ")}
                  </p>
                ) : null}
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
                  const mine = msg.authorId === selfId;
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
                    selected.category === "direct" ||
                    selected.category === "group"
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
              Select a message, start a direct chat, or create a group.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
