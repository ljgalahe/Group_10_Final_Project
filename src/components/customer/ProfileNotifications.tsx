"use client";

import { useState } from "react";
import { updateNotificationPreference } from "@/app/actions/profile";
import { CenteredModal } from "@/components/CenteredModal";
import {
  NOTIFICATION_TOPICS,
  formatNotificationDestinations,
  type NotificationChannel,
  type NotificationTopicKey,
  type NotificationTopicPref,
} from "@/lib/customer-payment-methods";

type PrefsMap = Record<NotificationTopicKey, NotificationTopicPref>;

export function ProfileNotifications({
  prefs,
  defaultEmail,
  defaultPhone,
}: {
  prefs: PrefsMap;
  defaultEmail: string;
  defaultPhone: string;
}) {
  const [dialog, setDialog] = useState<{
    topic: NotificationTopicKey;
    label: string;
  } | null>(null);
  const [channel, setChannel] = useState<NotificationChannel>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openEnableDialog(topic: NotificationTopicKey, label: string) {
    const existing = prefs[topic];
    setChannel(existing.channel || "email");
    setEmail(existing.email || defaultEmail || "");
    setPhone(existing.phone || defaultPhone || "");
    setDialog({ topic, label });
  }

  function applyChannel(next: NotificationChannel) {
    setChannel(next);
    // Always refresh destinations from profile contact defaults when switching
    if (next === "email") {
      setEmail(defaultEmail || email);
    } else if (next === "phone") {
      setPhone(defaultPhone || phone);
    } else {
      setEmail(defaultEmail || email);
      setPhone(defaultPhone || phone);
    }
  }

  async function disableTopic(topic: NotificationTopicKey) {
    const pref = prefs[topic];
    const fd = new FormData();
    fd.set("topic", topic);
    fd.set("enabled", "0");
    fd.set("channel", pref.channel || "email");
    fd.set("email", pref.email || defaultEmail);
    fd.set("phone", pref.phone || defaultPhone);
    setSubmitting(true);
    try {
      await updateNotificationPreference(fd);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCheck(
    e: React.ChangeEvent<HTMLInputElement>,
    topic: NotificationTopicKey,
    label: string
  ) {
    if (e.target.checked) {
      // Keep unchecked until popup confirms
      e.target.checked = false;
      openEnableDialog(topic, label);
    } else {
      void disableTopic(topic);
    }
  }

  const canSubmit =
    channel === "email"
      ? email.trim().length > 0
      : channel === "phone"
        ? phone.trim().length > 0
        : email.trim().length > 0 && phone.trim().length > 0;

  return (
    <>
      <ul className="mt-4 space-y-3">
        {NOTIFICATION_TOPICS.map((topic) => {
          const pref = prefs[topic.key];
          return (
            <li
              key={topic.key}
              className="rounded-lg border border-stone-200 px-4 py-3"
            >
              <label className="flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={pref.enabled}
                  disabled={submitting}
                  onChange={(e) => handleCheck(e, topic.key, topic.label)}
                  className="mt-1 rounded border-stone-300 text-green-800 focus:ring-green-800"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-green-950">
                    {topic.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-stone-500">
                    {topic.description}
                  </span>
                  {pref.enabled ? (
                    <span className="mt-1.5 block text-xs text-stone-600">
                      Via{" "}
                      {pref.channel === "both"
                        ? "email & phone"
                        : pref.channel}
                      {" · "}
                      {formatNotificationDestinations(pref)}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <CenteredModal
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        labelledBy="notify-how-title"
        backdropClassName="bg-black/40"
      >
        {dialog ? (
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
            <h2
              id="notify-how-title"
              className="text-lg font-semibold text-green-950"
            >
              How should we contact you?
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Choose how GreenScape should send{" "}
              <span className="font-medium text-stone-800">
                {dialog.label.toLowerCase()}
              </span>
              .
            </p>

            <form
              className="mt-5 space-y-4"
              action={async (fd) => {
                setSubmitting(true);
                try {
                  await updateNotificationPreference(fd);
                } finally {
                  setSubmitting(false);
                  setDialog(null);
                }
              }}
            >
              <input type="hidden" name="topic" value={dialog.topic} />
              <input type="hidden" name="enabled" value="1" />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="phone" value={phone} />

              <fieldset>
                <legend className="text-sm font-medium text-stone-800">
                  Contact method
                </legend>
                <div className="mt-2 space-y-2">
                  {(
                    [
                      ["email", "Email"],
                      ["phone", "Phone / text"],
                      ["both", "Both email and phone"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 px-3 py-2.5 text-sm has-[:checked]:border-green-800 has-[:checked]:bg-green-50"
                    >
                      <input
                        type="radio"
                        name="channel"
                        value={value}
                        checked={channel === value}
                        onChange={() => applyChannel(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {channel === "email" || channel === "both" ? (
                <div>
                  <label
                    htmlFor="notify_email"
                    className="block text-sm font-medium text-stone-700"
                  >
                    Email address
                  </label>
                  <input
                    id="notify_email"
                    type="email"
                    required={channel === "email" || channel === "both"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={defaultEmail || "name@company.com"}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
              ) : null}

              {channel === "phone" || channel === "both" ? (
                <div>
                  <label
                    htmlFor="notify_phone"
                    className="block text-sm font-medium text-stone-700"
                  >
                    Phone number
                  </label>
                  <input
                    id="notify_phone"
                    type="tel"
                    required={channel === "phone" || channel === "both"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={defaultPhone || "(662) 555-0000"}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  {!defaultPhone ? (
                    <p className="mt-1 text-xs text-amber-700">
                      Add a phone under Contact details if this is blank.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  disabled={submitting}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {submitting ? "Saving…" : "Turn on"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </CenteredModal>
    </>
  );
}
