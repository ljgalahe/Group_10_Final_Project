"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createDataClient, DEMO_SESSION_COOKIE } from "@/lib/auth-access";
import {
  buildPaymentMethodDisplayLabel,
  extractLastFour,
} from "@/lib/customer-payment-methods";
import {
  getViewCustomerId,
  getViewRole,
  roleCanEditContractDetails,
} from "@/lib/demo-role";
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
  const role = await getViewRole();
  const supabase = await createDataClient();
  const { data: order, error } = await supabase
    .from("extra_work_orders")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", extraWorkId)
    .select("id, contract_id, title, quoted_amount")
    .single();

  if (error || !order) return;

  if (role === "accountant") {
    await supabase.from("contract_audit_logs").insert({
      contract_id: order.contract_id,
      action: "change_order_approved",
      actor_role: role,
      details: {
        extra_work_id: order.id,
        title: order.title,
        quoted_amount: order.quoted_amount,
      },
    });
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${order.contract_id}`);
}

export async function generateInvoice(formData: FormData): Promise<void> {
  const role = await getViewRole();
  const contractId = formData.get("contract_id") as string;
  const supabase = await createDataClient();

  // Internal control (accountant contracts): no invoice until visits are complete
  if (role === "accountant") {
    const { data: openVisits } = await supabase
      .from("service_visits")
      .select("id")
      .eq("contract_id", contractId)
      .eq("status", "scheduled");

    if ((openVisits?.length ?? 0) > 0) {
      redirect(
        `/contracts/${contractId}?invoiceError=incomplete_visits&openVisits=${openVisits?.length ?? 0}`
      );
    }
  }

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

  if (role === "accountant") {
    await supabase.from("contract_audit_logs").insert({
      contract_id: contractId,
      action: "invoice_generated",
      actor_role: role,
      details: { invoice_id: invoice.id, invoice_number: invoiceNumber },
    });
  }

  revalidatePath("/invoices");
  revalidatePath("/reports/ar-aging");
  revalidatePath("/contracts");
  revalidatePath("/visits");
  revalidatePath(`/contracts/${contractId}`);
}

export async function createContract(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanEditContractDetails(role)) {
    return;
  }

  const supabase = await createDataClient();

  const title = (formData.get("title") as string)?.trim();
  const customerMode = formData.get("customer_mode") as string;
  const existingCustomerId = formData.get("customer_id") as string;
  const newCustomerName = (formData.get("new_customer_name") as string)?.trim();
  const propertyAddress = (formData.get("property_address") as string)?.trim();
  const contractValue = parseFloat(formData.get("contract_value") as string);
  const startDate = formData.get("start_date") as string;
  const endDate = formData.get("end_date") as string;
  const assignedCrew = (formData.get("assigned_crew") as string)?.trim();
  const accountManager = (formData.get("account_manager") as string)?.trim();
  const renewalDate = (formData.get("renewal_date") as string) || null;
  const billingFrequency = (formData.get("billing_frequency") as string) || "monthly";
  const status = (formData.get("status") as string) || "active";
  const visitsPerWeek = formData.get("visits_per_week")
    ? parseInt(formData.get("visits_per_week") as string, 10)
    : null;

  if (!title || !startDate || !endDate) {
    return;
  }

  let customerId = existingCustomerId;

  if (customerMode === "new") {
    if (!newCustomerName) return;
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: newCustomerName,
        address: propertyAddress || null,
        property_type: "Commercial",
      })
      .select("id")
      .single();

    if (customerError || !customer) return;
    customerId = customer.id;
  } else {
    if (!customerId) return;
    if (propertyAddress) {
      await supabase
        .from("customers")
        .update({ address: propertyAddress })
        .eq("id", customerId);
    }
  }

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      customer_id: customerId,
      title,
      status,
      season_start: startDate,
      season_end: endDate,
      monthly_fee: Number.isFinite(contractValue) ? contractValue : null,
      visits_per_week: Number.isFinite(visitsPerWeek as number)
        ? visitsPerWeek
        : null,
      billing_method: billingFrequency,
      assigned_crew: assignedCrew || null,
      account_manager: accountManager || null,
      renewal_date: renewalDate,
    })
    .select("id")
    .single();

  if (contractError || !contract) return;

  await supabase.from("contract_audit_logs").insert({
    contract_id: contract.id,
    action: "contract_created",
    actor_role: role,
    details: { title, customer_id: customerId, status },
  });

  revalidatePath("/contracts");
  revalidatePath("/dashboard");
  revalidatePath("/reports/profitability");
  redirect(`/contracts/${contract.id}`);
}

export async function updateContractDetails(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanEditContractDetails(role)) {
    return;
  }

  const supabase = await createDataClient();
  const contractId = formData.get("contract_id") as string;
  const customerId = formData.get("customer_id") as string;

  const customerName = (formData.get("customer_name") as string)?.trim();
  const propertyAddress = (formData.get("property_address") as string)?.trim();
  const contractValue = parseFloat(formData.get("contract_value") as string);
  const startDate = formData.get("start_date") as string;
  const endDate = formData.get("end_date") as string;
  const assignedCrew = (formData.get("assigned_crew") as string)?.trim();
  const accountManager = (formData.get("account_manager") as string)?.trim();
  const renewalDate = (formData.get("renewal_date") as string) || null;
  const billingFrequency = formData.get("billing_frequency") as string;

  if (!contractId || !customerId || !customerName || !startDate || !endDate) {
    return;
  }

  const proposedContract = {
    monthly_fee: Number.isFinite(contractValue) ? contractValue : null,
    season_start: startDate,
    season_end: endDate,
    assigned_crew: assignedCrew || null,
    account_manager: accountManager || null,
    renewal_date: renewalDate,
    billing_method: billingFrequency,
  };

  const proposedCustomer = {
    name: customerName,
    address: propertyAddress || null,
  };

  const { error } = await supabase.from("contract_change_requests").insert({
    contract_id: contractId,
    customer_id: customerId,
    requested_by_role: role,
    status: "pending",
    proposed_contract: proposedContract,
    proposed_customer: proposedCustomer,
    summary: `Update contract terms and customer details for manager approval`,
  });

  if (error) return;

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "edit_submitted_for_approval",
    actor_role: role,
    details: { proposedContract, proposedCustomer },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
}

export async function approveContractChangeRequest(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanEditContractDetails(role)) {
    return;
  }

  const requestId = formData.get("request_id") as string;
  const supabase = await createDataClient();

  const { data: request, error } = await supabase
    .from("contract_change_requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .single();

  if (error || !request) return;

  const proposedContract = request.proposed_contract as Record<string, unknown>;
  const proposedCustomer = request.proposed_customer as Record<
    string,
    unknown
  > | null;

  if (proposedCustomer && request.customer_id) {
    const { error: customerError } = await supabase
      .from("customers")
      .update(proposedCustomer)
      .eq("id", request.customer_id);
    if (customerError) return;
  }

  const { error: contractError } = await supabase
    .from("contracts")
    .update(proposedContract)
    .eq("id", request.contract_id);
  if (contractError) return;

  await supabase
    .from("contract_change_requests")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by_role: "manager",
    })
    .eq("id", requestId);

  await supabase.from("contract_audit_logs").insert({
    contract_id: request.contract_id,
    action: "edit_approved_by_manager",
    actor_role: "manager",
    details: {
      request_id: requestId,
      applied_by_demo_role: role,
      proposedContract,
      proposedCustomer,
    },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${request.contract_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports/profitability");
}

export async function rejectContractChangeRequest(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanEditContractDetails(role)) {
    return;
  }

  const requestId = formData.get("request_id") as string;
  const supabase = await createDataClient();

  const { data: request, error } = await supabase
    .from("contract_change_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by_role: "manager",
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("contract_id")
    .single();

  if (error || !request) return;

  await supabase.from("contract_audit_logs").insert({
    contract_id: request.contract_id,
    action: "edit_rejected_by_manager",
    actor_role: "manager",
    details: { request_id: requestId, applied_by_demo_role: role },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${request.contract_id}`);
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
  const methodId = ((formData.get("payment_method_id") as string) || "").trim();
  const isNew = formData.get("is_new_method") === "1";
  const newNickname = ((formData.get("new_method_nickname") as string) || "").trim();
  const newDetails = ((formData.get("new_method_details") as string) || "").trim();
  const requestedAmount = parseFloat(
    (formData.get("amount") as string) || ""
  );

  const supabase = await createDataClient();
  const role = await getViewRole();
  const customerId =
    role === "customer" ? await getViewCustomerId() : null;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return;

  // Customers may only pay their own invoices
  if (customerId && invoice.customer_id !== customerId) return;

  const balance = Number(invoice.total) - Number(invoice.amount_paid);
  if (balance <= 0) return;

  // Default to full balance if amount missing; allow any amount up to balance
  let payAmount = Number.isFinite(requestedAmount)
    ? requestedAmount
    : balance;
  payAmount = Math.round(payAmount * 100) / 100;
  if (payAmount <= 0 || payAmount > balance + 0.001) return;
  payAmount = Math.min(payAmount, balance);

  let paymentMethodLabel = "Card ending in 4242";

  if (isNew && customerId) {
    const methodTypeRaw = (
      (formData.get("new_method_type") as string) || "card"
    ).trim();
    const methodType = methodTypeRaw === "bank" ? "bank" : "card";
    const billingName = (
      (formData.get("new_method_billing_name") as string) || ""
    ).trim();
    const expMonth = parseInt(
      ((formData.get("new_method_exp_month") as string) || "").trim(),
      10
    );
    const expYear = parseInt(
      ((formData.get("new_method_exp_year") as string) || "").trim(),
      10
    );
    const makeDefault = formData.get("new_method_is_default") === "1";

    const displayLabel = buildPaymentMethodDisplayLabel(
      newNickname,
      newDetails,
      methodType
    );
    const lastFour = extractLastFour(newDetails);
    if (!displayLabel || !lastFour) return;

    const validExpMonth =
      Number.isFinite(expMonth) && expMonth >= 1 && expMonth <= 12;
    const validExpYear = Number.isFinite(expYear) && expYear >= 2024;

    if (makeDefault) {
      await supabase
        .from("customer_payment_methods")
        .update({ is_default: false })
        .eq("customer_id", customerId);
    }

    const { count } = await supabase
      .from("customer_payment_methods")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId);
    const isFirst = (count ?? 0) === 0;

    const { data: saved, error } = await supabase
      .from("customer_payment_methods")
      .insert({
        customer_id: customerId,
        nickname: newNickname || null,
        display_label: displayLabel,
        method_type: methodType,
        last_four: lastFour,
        billing_name: billingName || null,
        expires_month:
          methodType === "card" && validExpMonth ? expMonth : null,
        expires_year: methodType === "card" && validExpYear ? expYear : null,
        is_default: makeDefault || isFirst,
      })
      .select("display_label")
      .single();

    if (error || !saved) return;
    paymentMethodLabel = saved.display_label;
  } else if (methodId && customerId) {
    const { data: method } = await supabase
      .from("customer_payment_methods")
      .select("display_label")
      .eq("id", methodId)
      .eq("customer_id", customerId)
      .single();

    if (!method) return;
    paymentMethodLabel = method.display_label;
  } else if (methodId) {
    const { data: method } = await supabase
      .from("customer_payment_methods")
      .select("display_label")
      .eq("id", methodId)
      .single();
    if (method) paymentMethodLabel = method.display_label;
  }

  const paymentFormData = new FormData();
  paymentFormData.set("invoice_id", invoiceId);
  paymentFormData.set("amount", payAmount.toFixed(2));
  paymentFormData.set("payment_method", "card");
  paymentFormData.set("payment_date", new Date().toISOString().slice(0, 10));
  paymentFormData.set(
    "notes",
    payAmount + 0.001 >= balance
      ? `Customer portal payment (full) · ${paymentMethodLabel}`
      : `Customer portal payment (partial) · ${paymentMethodLabel}`
  );
  paymentFormData.set("reference_number", "CUSTOMER-PORTAL");

  await recordPayment(paymentFormData);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}
