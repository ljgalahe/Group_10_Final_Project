export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

export function statusColor(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    scheduled: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    approved: "bg-green-100 text-green-800",
    quoted: "bg-purple-100 text-purple-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}
