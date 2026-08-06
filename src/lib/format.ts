export function formatCurrency(amount: number) {
  const value = Number(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(dateStr: string) {
  // Parse as UTC noon so SSR and client locales agree on the calendar day.
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}

export function daysBetween(start: string, end: Date = new Date()) {
  const startDate = new Date(start + "T00:00:00");
  return Math.floor(
    (end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getAgingBucket(dueDate: string, amountPaid: number, total: number) {
  if (amountPaid >= total) return "paid";
  const daysOverdue = daysBetween(dueDate);
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

/** Display-only: past due with balance = overdue; partial pay = partial when current. */
export function getDisplayInvoiceStatus(
  status: string,
  dueDate: string,
  balance: number,
  amountPaid = 0,
  forCustomer = false
) {
  if (status === "paid" || balance <= 0) {
    return "paid";
  }

  if (status === "disputed") {
    return "disputed";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  if (due < today) {
    return "overdue";
  }

  if (amountPaid > 0.001) {
    return "partial";
  }

  // Customers shouldn't see internal "draft" / "sent" workflow labels.
  if (forCustomer && status === "draft") {
    return "upcoming";
  }
  if (forCustomer && status === "sent") {
    // Due date is today (past due already handled above).
    if (due.getTime() === today.getTime()) {
      return "due_now";
    }
    // Issued but not yet due.
    return "open";
  }

  return status;
}

export function statusColor(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    draft: "bg-gray-100 text-gray-800",
    upcoming: "bg-sky-100 text-sky-900",
    sent: "bg-blue-100 text-blue-800",
    due_now: "bg-amber-100 text-amber-900",
    open: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    past_due: "bg-red-100 text-red-800",
    partially_paid: "bg-amber-100 text-amber-900",
    partial: "bg-amber-100 text-amber-900",
    disputed: "bg-orange-100 text-orange-900",
    canceled: "bg-stone-200 text-stone-700",
    voided: "bg-stone-200 text-stone-700",
    applied: "bg-green-100 text-green-800",
    void: "bg-stone-200 text-stone-700",
    scheduled: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    approved: "bg-green-100 text-green-800",
    quoted: "bg-purple-100 text-purple-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}
