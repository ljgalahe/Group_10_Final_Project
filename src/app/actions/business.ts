"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createDataClient, DEMO_SESSION_COOKIE } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import {
  isValidPaymentMethod,
  nextInvoiceStatusAfterPayment,
  normalizePaymentMethod,
} from "@/lib/payment-utils";
import {
  buildLegacyPaymentNotes,
  isMissingColumnError,
  nextPaymentNumber,
} from "@/lib/payment-schema";
import type { CostType } from "@/lib/types";
import { cookies } from "next/headers";

export type RecordPaymentResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function completeVisit(formData: FormData): Promise<void> {
  const visitId = formData.get("visit_id") as string;
  const notes = (formData.get("notes") as string) || undefined;
  const supabase = await createDataClient();
  const { error } = await supabase
    .from("service_visits")
    .update({
      status: "completed",
      crew_notes: notes ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (error) return;
  revalidatePath("/visits");
  revalidatePath("/dashboard");
}

export async function addVisitCost(formData: FormData): Promise<void> {
  const supabase = await createDataClient();
  const visitId = formData.get("visit_id") as string;
  const costType = formData.get("cost_type") as CostType;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const quantity = formData.get("quantity")
    ? parseFloat(formData.get("quantity") as string)
    : null;

  const { error } = await supabase.from("visit_costs").insert({
    visit_id: visitId,
    cost_type: costType,
    description,
    amount,
    quantity,
  });

  if (error) return;
  revalidatePath("/visits");
  revalidatePath("/reports/profitability");
}

export async function approveExtraWork(formData: FormData): Promise<void> {
  const extraWorkId = formData.get("extra_work_id") as string;
  const supabase = await createDataClient();
  const { error } = await supabase
    .from("extra_work_orders")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", extraWorkId);

  if (error) return;
  revalidatePath("/contracts");
}

export async function generateInvoice(formData: FormData): Promise<void> {
  const contractId = formData.get("contract_id") as string;
  const supabase = await createDataClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, customers(*)")
    .eq("id", contractId)
    .single();

  if (!contract) return;

  const { data: extraWork } = await supabase
    .from("extra_work_orders")
    .select("*")
    .eq("contract_id", contractId)
    .eq("status", "approved");

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const lines: { description: string; amount: number; line_type: string }[] = [];

  if (contract.monthly_fee) {
    lines.push({
      description: `Monthly maintenance — ${contract.title}`,
      amount: Number(contract.monthly_fee),
      line_type: "recurring",
    });
  }

  for (const work of extraWork ?? []) {
    lines.push({
      description: `Extra work: ${work.title}`,
      amount: Number(work.quoted_amount),
      line_type: "extra_work",
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      contract_id: contractId,
      customer_id: contract.customer_id,
      invoice_number: invoiceNumber,
      issue_date: issueDate.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
      status: "sent",
      subtotal,
      total: subtotal,
      amount_paid: 0,
    })
    .select()
    .single();

  if (invoiceError || !invoice) return;

  if (lines.length > 0) {
    await supabase.from("invoice_lines").insert(
      lines.map((line) => ({
        invoice_id: invoice.id,
        ...line,
      }))
    );
  }

  revalidatePath("/invoices");
  revalidatePath("/reports/ar-aging");
}

async function resolveRecorder(): Promise<{
  recordedBy: string | null;
  recordedByName: string;
}> {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get(DEMO_SESSION_COOKIE)?.value === "active";

  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (user) {
      const { data: profile } = await authClient
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      return {
        recordedBy: user.id,
        recordedByName: profile?.full_name || user.email || "Authenticated User",
      };
    }
  } catch {
    // Fall through to demo attribution
  }

  if (isDemo) {
    const role = await getViewRole();
    const labels: Record<string, string> = {
      manager: "Manager (Demo)",
      accountant: "Accountant (Demo)",
      crew_lead: "Crew Lead (Demo)",
      customer: "Customer (Demo)",
    };
    return {
      recordedBy: null,
      recordedByName: labels[role] ?? "Demo User",
    };
  }

  return { recordedBy: null, recordedByName: "Unknown User" };
}

export async function recordPayment(
  formData: FormData
): Promise<RecordPaymentResult> {
  const supabase = await createDataClient();
  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  const amount = parseFloat(String(formData.get("amount") ?? ""));
  const rawMethod = String(formData.get("payment_method") ?? "").trim();
  const paymentMethod = normalizePaymentMethod(rawMethod || "card");
  const notes = String(formData.get("notes") ?? "").trim();
  const referenceNumber = String(formData.get("reference_number") ?? "").trim();
  const paymentDateRaw = String(formData.get("payment_date") ?? "").trim();
  const allowFuture = String(formData.get("allow_future_date") ?? "") === "true";

  if (!invoiceId) {
    return { success: false, error: "Select an invoice to apply this payment." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Payment amount must be greater than zero." };
  }

  if (!isValidPaymentMethod(paymentMethod)) {
    return {
      success: false,
      error: "Choose a valid payment method (Check, ACH, Card, or Bank Transfer).",
    };
  }

  if (paymentMethod === "check" && !referenceNumber) {
    return {
      success: false,
      error: "Check payments require a reference / check number.",
    };
  }

  const paymentDate =
    paymentDateRaw || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    return { success: false, error: "Enter a valid payment date." };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (paymentDate > today && !allowFuture) {
    return {
      success: false,
      error:
        "Payment date is in the future. Confirm to continue, or choose today/earlier.",
    };
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return { success: false, error: "Invoice not found." };
  }

  if (invoice.status === "canceled" || invoice.status === "voided") {
    return {
      success: false,
      error: "Canceled or voided invoices cannot receive payments.",
    };
  }

  if (invoice.status === "paid") {
    return { success: false, error: "This invoice is already fully paid." };
  }

  const total = Number(invoice.total);
  const amountPaid = Number(invoice.amount_paid);
  const remaining = Math.round((total - amountPaid) * 100) / 100;

  if (remaining <= 0) {
    return { success: false, error: "This invoice has no remaining balance." };
  }

  if (amount - remaining > 0.001) {
    return {
      success: false,
      error: `Payment cannot exceed the remaining balance of $${remaining.toFixed(2)}.`,
    };
  }

  const { recordedBy, recordedByName } = await resolveRecorder();
  const paymentNumber = await nextPaymentNumber(supabase);
  const legacyNotes = buildLegacyPaymentNotes({
    notes,
    referenceNumber,
    recordedByName,
  });

  // Prefer atomic DB function when migration has been applied.
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "record_invoice_payment",
    {
      p_invoice_id: invoiceId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_payment_date: paymentDate,
      p_reference_number: referenceNumber || null,
      p_notes: notes || null,
      p_recorded_by: recordedBy,
      p_recorded_by_name: recordedByName,
      p_payment_number: paymentNumber,
      p_customer_id: invoice.customer_id,
    }
  );

  let newStatus: string | null = null;

  if (!rpcError && rpcData) {
    const result = rpcData as { status?: string };
    newStatus = result.status ?? null;
  } else {
    const rpcMissing =
      !!rpcError &&
      (/could not find the function/i.test(rpcError.message) ||
        rpcError.code === "PGRST202");

    if (rpcError && !rpcMissing) {
      return {
        success: false,
        error: rpcError.message || "Failed to record payment.",
      };
    }

    let insertedId: string | null = null;

    // Current shared schema includes payment_number / customer_id / applied amounts.
    const currentSchemaInsert = await supabase
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        customer_id: invoice.customer_id,
        payment_number: paymentNumber,
        amount,
        applied_amount: amount,
        unapplied_amount: 0,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: legacyNotes,
      })
      .select("id")
      .single();

    let paymentError = currentSchemaInsert.error;
    insertedId = currentSchemaInsert.data?.id ?? null;

    // Optional manager columns from our migration (if present).
    if (!paymentError && insertedId) {
      await supabase
        .from("payments")
        .update({
          reference_number: referenceNumber || null,
          recorded_by: recordedBy,
          recorded_by_name: recordedByName,
          status: "applied",
        })
        .eq("id", insertedId);
    }

    // Fallback for environments without teammate payment_number columns.
    if (paymentError && isMissingColumnError(paymentError)) {
      const legacyInsert = await supabase
        .from("payments")
        .insert({
          invoice_id: invoiceId,
          amount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          notes: legacyNotes,
          reference_number: referenceNumber || null,
          recorded_by: recordedBy,
          recorded_by_name: recordedByName,
          status: "applied",
        })
        .select("id")
        .single();

      if (legacyInsert.error && isMissingColumnError(legacyInsert.error)) {
        const baseInsert = await supabase
          .from("payments")
          .insert({
            invoice_id: invoiceId,
            amount,
            payment_date: paymentDate,
            payment_method: paymentMethod,
            notes: legacyNotes,
          })
          .select("id")
          .single();
        paymentError = baseInsert.error;
        insertedId = baseInsert.data?.id ?? null;
      } else {
        paymentError = legacyInsert.error;
        insertedId = legacyInsert.data?.id ?? null;
      }
    }

    if (paymentError) {
      return {
        success: false,
        error: paymentError.message || "Failed to save payment.",
      };
    }

    const newAmountPaid = Math.round((amountPaid + amount) * 100) / 100;
    newStatus = nextInvoiceStatusAfterPayment(
      invoice.status,
      newAmountPaid,
      total
    );

    const { error: updateError } = await supabase
      .from("invoices")
      .update({ amount_paid: newAmountPaid, status: newStatus })
      .eq("id", invoiceId);

    if (updateError) {
      if (insertedId) {
        await supabase.from("payments").delete().eq("id", insertedId);
      }
      return {
        success: false,
        error:
          "Could not update invoice balance. Payment was not kept. Please try again.",
      };
    }
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/payments");
  revalidatePath("/reports/ar-aging");
  revalidatePath("/reports/profitability");
  revalidatePath("/dashboard");

  return {
    success: true,
    message:
      newStatus === "paid"
        ? "Payment recorded. Invoice is now fully paid."
        : "Payment recorded. Invoice marked partially paid.",
  };
}

export async function getOpenInvoicesForCustomer(customerId: string) {
  const { fetchOpenInvoicesForCustomer } = await import("@/lib/queries");
  if (!customerId) return { data: [], error: "Customer required" };
  const { data, error } = await fetchOpenInvoicesForCustomer(customerId);
  return { data, error: error?.message ?? null };
}

export async function customerPayInvoice(formData: FormData): Promise<void> {
  const invoiceId = formData.get("invoice_id") as string;
  const supabase = await createDataClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return;

  const balance = Number(invoice.total) - Number(invoice.amount_paid);
  if (balance <= 0) return;

  const paymentFormData = new FormData();
  paymentFormData.set("invoice_id", invoiceId);
  paymentFormData.set("amount", balance.toString());
  paymentFormData.set("payment_method", "card");
  paymentFormData.set("payment_date", new Date().toISOString().slice(0, 10));
  paymentFormData.set("notes", "Customer portal simulated payment");
  paymentFormData.set("reference_number", "CUSTOMER-PORTAL");

  await recordPayment(paymentFormData);
}
