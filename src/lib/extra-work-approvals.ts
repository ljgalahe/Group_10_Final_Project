/** Shared manager demo approvals so Extra work approval and contract charts stay in sync. */

export const EXTRA_DEMO_DECISIONS_KEY = "greenscape-extra-demo-decisions";

export type ExtraDemoDecision = "approved" | "declined";

export function demoExtraDecisionKey(contractId: string, title: string) {
  return `contract::${contractId}::${title}`;
}

export function loadExtraDemoDecisions(): Record<string, ExtraDemoDecision> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EXTRA_DEMO_DECISIONS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ExtraDemoDecision>) : {};
  } catch {
    return {};
  }
}

export function saveExtraDemoDecision(
  contractId: string,
  title: string,
  status: ExtraDemoDecision
) {
  const key = demoExtraDecisionKey(contractId, title);
  const next = { ...loadExtraDemoDecisions(), [key]: status };
  window.localStorage.setItem(EXTRA_DEMO_DECISIONS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("greenscape-extra-approvals-updated"));
  return next;
}

export function isExtraDemoApproved(contractId: string, title: string) {
  const key = demoExtraDecisionKey(contractId, title);
  return loadExtraDemoDecisions()[key] === "approved";
}

export function loadContractLocalExtraApprovals(contractId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(
      `greenscape-extra-job-approvals:${contractId}`
    );
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveContractLocalExtraApproval(
  contractId: string,
  service: string
) {
  const current = loadContractLocalExtraApprovals(contractId);
  const next = [...new Set([...current, service])];
  window.localStorage.setItem(
    `greenscape-extra-job-approvals:${contractId}`,
    JSON.stringify(next)
  );
  saveExtraDemoDecision(contractId, service, "approved");
  return next;
}

export function saveContractLocalExtraDecline(
  contractId: string,
  service: string
) {
  const approved = loadContractLocalExtraApprovals(contractId).filter(
    (name) => name !== service
  );
  window.localStorage.setItem(
    `greenscape-extra-job-approvals:${contractId}`,
    JSON.stringify(approved)
  );
  return saveExtraDemoDecision(contractId, service, "declined");
}

export function isExtraDemoDeclined(contractId: string, title: string) {
  const key = demoExtraDecisionKey(contractId, title);
  return loadExtraDemoDecisions()[key] === "declined";
}
