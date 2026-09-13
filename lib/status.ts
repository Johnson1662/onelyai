export const FUNNEL_STAGES = [
  "discovered",
  "qualified",
  "verified",
  "ready_for_outreach",
  "contacted",
  "replied",
  "interested",
  "signed_up",
  "activated",
] as const;

export type FunnelStatus = (typeof FUNNEL_STAGES)[number] | "not_interested" | "disqualified";

export const REAL_STATUS_OPTIONS = ["discovered", "qualified", "verified", "ready_for_outreach", "disqualified"] as const;

export function normalizeFunnelStatus(value: string): FunnelStatus {
  if (value === "candidate_verified") return "verified";
  if ([...FUNNEL_STAGES, "not_interested", "disqualified"].includes(value as FunnelStatus)) {
    return value as FunnelStatus;
  }
  throw new Error(`Unsupported funnel status: ${value}`);
}

export function isPositiveStage(status: string): status is (typeof FUNNEL_STAGES)[number] {
  return (FUNNEL_STAGES as readonly string[]).includes(status);
}

export function getStageIndex(status: string) {
  return FUNNEL_STAGES.indexOf(status as (typeof FUNNEL_STAGES)[number]);
}

export function canChangeRealStatus(current: string, next: string) {
  if (![...REAL_STATUS_OPTIONS].includes(next as (typeof REAL_STATUS_OPTIONS)[number])) return false;
  if (next === "disqualified") return current !== "disqualified";
  if (current === "disqualified") return next === "verified";
  const currentIndex = REAL_STATUS_OPTIONS.indexOf(current as (typeof REAL_STATUS_OPTIONS)[number]);
  const nextIndex = REAL_STATUS_OPTIONS.indexOf(next as (typeof REAL_STATUS_OPTIONS)[number]);
  return currentIndex >= 0 && nextIndex === currentIndex + 1;
}
