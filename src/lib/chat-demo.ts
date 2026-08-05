export type ChatCategory =
  | "announcement"
  | "fyi"
  | "question"
  | "direct";

export type ChatPerson = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  category: ChatCategory;
  title: string;
  preview: string;
  authorId: string;
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
  unread?: number;
  /** Visit/job context when started from a field concern */
  visitId?: string;
  jobLabel?: string;
  companyName?: string;
  messages: ChatMessage[];
};

const THREADS_KEY = "greenscape-chat-threads";

export const CHAT_PEOPLE: ChatPerson[] = [
  {
    id: "manager",
    name: "Morgan Hale",
    role: "Manager",
    initials: "MH",
  },
  {
    id: "alex-rivera",
    name: "Alex Rivera",
    role: "Crew lead",
    initials: "AR",
  },
  {
    id: "taylor-brooks",
    name: "Taylor Brooks",
    role: "Crew lead",
    initials: "TB",
  },
  {
    id: "sam-ortiz",
    name: "Sam Ortiz",
    role: "Crew lead",
    initials: "SO",
  },
  {
    id: "jordan-lee",
    name: "Jordan Lee",
    role: "Crew member",
    initials: "JL",
  },
  {
    id: "accountant",
    name: "Priya Shah",
    role: "Accountant",
    initials: "PS",
  },
  {
    id: "customer-riverside",
    name: "Riverside Office Park",
    role: "Customer",
    initials: "RO",
  },
];

export function personById(id: string): ChatPerson | undefined {
  return CHAT_PEOPLE.find((p) => p.id === id);
}

export function personByName(name: string): ChatPerson | undefined {
  const needle = name.trim().toLowerCase();
  return CHAT_PEOPLE.find((p) => p.name.toLowerCase() === needle);
}

export function crewLeadPersonId(name: string, role?: string): string {
  const byName = personByName(name);
  if (byName) return byName.id;
  // Fallback slug for unknown leads
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function categoryLabel(category: ChatCategory): string {
  if (category === "announcement") return "Announcement";
  if (category === "fyi") return "FYI";
  if (category === "question") return "Question";
  return "Direct";
}

export function categoryEmoji(category: ChatCategory): string {
  if (category === "announcement") return "📢";
  if (category === "fyi") return "✨";
  if (category === "question") return "👋";
  return "💬";
}

function seedThreads(): ChatThread[] {
  const now = Date.now();
  return [
    {
      id: "ann-week",
      category: "announcement",
      title: "Week of August 4 — storm follow-ups",
      preview:
        "Prioritize Summit and Harbor sites for debris checks. Flag dry patches in photo proof.",
      authorId: "manager",
      participantIds: ["manager", "alex-rivera", "taylor-brooks", "sam-ortiz"],
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
      unread: 0,
      messages: [
        {
          id: "m1",
          authorId: "manager",
          body: "Prioritize Summit and Harbor sites for debris checks this week. Flag dry patches in photo proof so managers can approve or hold work.",
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
      ],
    },
    {
      id: "ann-safety",
      category: "announcement",
      title: "Heat advisory protocol",
      preview:
        "Start outdoor routes before 10am when the heat index is above 100°F.",
      authorId: "manager",
      participantIds: ["manager", "alex-rivera", "taylor-brooks", "sam-ortiz"],
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString(),
      messages: [
        {
          id: "m2",
          authorId: "manager",
          body: "Start outdoor routes before 10am when the heat index is above 100°F. Carry extra water and pause edging if winds pick up.",
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString(),
        },
      ],
    },
    {
      id: "fyi-mulch",
      category: "fyi",
      title: "Mulch delivery — Riverside",
      preview: "Pallets arrive Tuesday; stage near the north lot gate.",
      authorId: "alex-rivera",
      participantIds: ["manager", "alex-rivera"],
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
      unread: 1,
      messages: [
        {
          id: "m3",
          authorId: "alex-rivera",
          body: "Pallets arrive Tuesday morning. Staging near the north lot gate — please keep the drive clear.",
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
        },
      ],
    },
    {
      id: "dm-alex",
      category: "direct",
      title: "Alex Rivera",
      preview: "Got it — I'll re-check the dry patch tomorrow.",
      authorId: "alex-rivera",
      participantIds: ["manager", "alex-rivera"],
      createdAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      messages: [
        {
          id: "m4",
          authorId: "manager",
          body: "Alex — can you look at the dry patch near the Riverside walkway from last week's proof?",
          createdAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
        },
        {
          id: "m5",
          authorId: "alex-rivera",
          body: "Got it — I'll re-check the dry patch tomorrow before we start mowing.",
          createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        },
      ],
    },
    {
      id: "dm-taylor",
      category: "direct",
      title: "Taylor Brooks",
      preview: "Summit frontage is clear after storm cleanup.",
      authorId: "taylor-brooks",
      participantIds: ["manager", "taylor-brooks"],
      createdAt: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
      messages: [
        {
          id: "m6",
          authorId: "taylor-brooks",
          body: "Summit frontage is clear after storm cleanup. Photos uploaded on the visit.",
          createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
        },
      ],
    },
  ];
}

function readThreads(): ChatThread[] {
  if (typeof window === "undefined") return seedThreads();
  try {
    const raw = window.localStorage.getItem(THREADS_KEY);
    if (!raw) {
      const seed = seedThreads();
      window.localStorage.setItem(THREADS_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as ChatThread[];
  } catch {
    return seedThreads();
  }
}

function writeThreads(threads: ChatThread[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  window.dispatchEvent(new Event("greenscape-chat-updated"));
}

export function loadChatThreads(): ChatThread[] {
  return readThreads().sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function saveChatThreads(threads: ChatThread[]) {
  writeThreads(threads);
}

export function upsertDirectThread(opts: {
  withPersonId: string;
  fromPersonId?: string;
  visitId?: string;
  jobLabel?: string;
  companyName?: string;
  concernLabel?: string;
  seedMessage?: string;
}): ChatThread {
  const fromId = opts.fromPersonId ?? "manager";
  const withPerson = personById(opts.withPersonId);
  const threads = readThreads();
  const existing = threads.find(
    (t) =>
      t.category === "direct" &&
      t.participantIds.includes(fromId) &&
      t.participantIds.includes(opts.withPersonId) &&
      (!opts.visitId || t.visitId === opts.visitId)
  );

  if (existing) {
    if (opts.seedMessage) {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}`,
        authorId: fromId,
        body: opts.seedMessage,
        createdAt: new Date().toISOString(),
      };
      existing.messages = [...existing.messages, msg];
      existing.preview = opts.seedMessage;
      existing.updatedAt = msg.createdAt;
      if (opts.visitId) existing.visitId = opts.visitId;
      if (opts.jobLabel) existing.jobLabel = opts.jobLabel;
      if (opts.companyName) existing.companyName = opts.companyName;
      writeThreads(
        threads.map((t) => (t.id === existing.id ? existing : t))
      );
    }
    return existing;
  }

  const now = new Date().toISOString();
  const seedBody =
    opts.seedMessage ??
    (opts.concernLabel
      ? `Hi ${withPerson?.name ?? "there"} — reviewing a field concern on ${opts.companyName ?? "this site"} (${opts.jobLabel ?? "visit"}): ${opts.concernLabel}. Can you take a look?`
      : `Hi ${withPerson?.name ?? "there"} — reaching out about a job.`);

  const thread: ChatThread = {
    id: `dm-${opts.withPersonId}-${opts.visitId ?? "general"}-${Date.now()}`,
    category: "direct",
    title: withPerson?.name ?? "Direct chat",
    preview: seedBody,
    authorId: fromId,
    participantIds: [fromId, opts.withPersonId],
    createdAt: now,
    updatedAt: now,
    visitId: opts.visitId,
    jobLabel: opts.jobLabel,
    companyName: opts.companyName,
    messages: [
      {
        id: `msg-${Date.now()}`,
        authorId: fromId,
        body: seedBody,
        createdAt: now,
      },
    ],
  };

  writeThreads([thread, ...threads]);
  return thread;
}

export function postChatMessage(
  threadId: string,
  authorId: string,
  body: string
): ChatThread | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  const threads = readThreads();
  const idx = threads.findIndex((t) => t.id === threadId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const msg: ChatMessage = {
    id: `msg-${Date.now()}`,
    authorId,
    body: trimmed,
    createdAt: now,
  };
  const next = {
    ...threads[idx],
    messages: [...threads[idx].messages, msg],
    preview: trimmed,
    updatedAt: now,
  };
  threads[idx] = next;
  writeThreads(threads);
  return next;
}

export function createAnnouncement(opts: {
  title: string;
  body: string;
  category: Exclude<ChatCategory, "direct">;
  authorId?: string;
}): ChatThread {
  const authorId = opts.authorId ?? "manager";
  const now = new Date().toISOString();
  const thread: ChatThread = {
    id: `ann-${Date.now()}`,
    category: opts.category,
    title: opts.title.trim() || "Untitled",
    preview: opts.body.trim(),
    authorId,
    participantIds: CHAT_PEOPLE.filter((p) => p.role !== "Customer").map(
      (p) => p.id
    ),
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `msg-${Date.now()}`,
        authorId,
        body: opts.body.trim(),
        createdAt: now,
      },
    ],
  };
  writeThreads([thread, ...readThreads()]);
  return thread;
}

/** Build a Chat deep-link to message a crew lead about a concern. */
export function chatHrefForCrewLead(opts: {
  crewLeadName: string;
  visitId: string;
  jobLabel: string;
  companyName: string;
  concernLabel: string;
}): string {
  const person =
    personByName(opts.crewLeadName) ??
    ({
      id: crewLeadPersonId(opts.crewLeadName),
      name: opts.crewLeadName,
    } as ChatPerson);

  const params = new URLSearchParams({
    with: person.id,
    visit: opts.visitId,
    job: opts.jobLabel,
    company: opts.companyName,
    concern: opts.concernLabel,
  });
  return `/chat?${params.toString()}`;
}
