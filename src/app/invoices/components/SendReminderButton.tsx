import { sendPaymentReminder } from "@/app/invoices/actions";

export function SendReminderButton({
  invoiceId,
}: {
  invoiceId: string;
}) {
  return (
    <form action={sendPaymentReminder}>
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <button
        type="submit"
        className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
      >
        Send Payment Reminder
      </button>
    </form>
  );
}
