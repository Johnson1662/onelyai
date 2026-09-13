import { z } from "zod";
import { canonicalizeUrl, cleanText } from "./normalize";
import { getSegmentGroup } from "./taxonomy";
import { calculateScores, SCORE_DEFINITIONS, SCORE_VERSION, type ScoreInputs } from "./scoring";
import { normalizeFunnelStatus } from "./status";
import type { CandidateImportRecord } from "./import";

const manualBaseSchema = z.object({
  candidateId: z.string().trim().optional(),
  candidateOrigin: z.string().trim().min(1).default("discovery"),
  name: z.string().trim().min(1),
  brandOrHandle: z.string().trim().min(1),
  segment: z.string().trim().min(1),
  primaryPlatformOrAsset: z.string().trim().min(1),
  publicProfileUrl: z.string().url(),
  contactType: z.string().trim().min(1),
  contactSourceUrl: z.string().url(),
  contactValuePublic: z.string().trim().min(1),
  matchReason: z.string().trim().min(1),
  ownedAudienceSignal: z.string().trim().min(1),
  monetizationSignal: z.string().trim().min(1),
  aiAffinity: z.string().trim().min(1),
  networkValueSignal: z.string().trim().min(1),
  verificationLevel: z.enum(["A", "B", "C"]).default("C"),
  verifiedAt: z.string().trim().default(() => new Date().toISOString().slice(0, 10)),
  funnelStatus: z.string().default("discovered"),
  outreachStatus: z.string().default("not_contacted_case_restriction"),
  riskOrCaveat: z.string().trim().optional(),
  evidence: z.array(z.object({ url: z.string().url(), summary: z.string().trim().min(1) })).min(1).max(2),
  scoreInputs: z.record(z.number()),
  discoveryId: z.number().int().positive().optional(),
});

export function buildManualRecord(input: unknown): { record: CandidateImportRecord; discoveryId?: number } {
  const parsed = manualBaseSchema.parse(input);
  const scoreInputs = {} as ScoreInputs;
  for (const definition of SCORE_DEFINITIONS) {
    const value = parsed.scoreInputs[definition.key];
    if (!Number.isInteger(value) || value < 0 || value > definition.max) {
      throw new Error(`${definition.key} must be an integer between 0 and ${definition.max}`);
    }
    scoreInputs[definition.key] = value;
  }
  const funnelStatus = normalizeFunnelStatus(parsed.funnelStatus);
  calculateScores(scoreInputs);
  const candidateId = cleanText(parsed.candidateId) || `manual-${Date.now()}`;
  return {
    discoveryId: parsed.discoveryId,
    record: {
      candidateId,
      candidateOrigin: parsed.candidateOrigin,
      name: parsed.name,
      brandOrHandle: parsed.brandOrHandle,
      segment: parsed.segment,
      segmentGroup: getSegmentGroup(parsed.segment),
      primaryPlatformOrAsset: parsed.primaryPlatformOrAsset,
      publicProfileUrl: parsed.publicProfileUrl,
      canonicalProfileUrl: canonicalizeUrl(parsed.publicProfileUrl),
      contactType: parsed.contactType,
      contactSourceUrl: parsed.contactSourceUrl,
      contactValuePublic: parsed.contactValuePublic,
      matchReason: parsed.matchReason,
      ownedAudienceSignal: parsed.ownedAudienceSignal,
      monetizationSignal: parsed.monetizationSignal,
      aiAffinity: parsed.aiAffinity,
      networkValueSignal: parsed.networkValueSignal,
      verificationLevel: parsed.verificationLevel,
      verifiedAt: parsed.verifiedAt,
      funnelStatus,
      rawFunnelStatus: parsed.funnelStatus,
      outreachStatus: parsed.outreachStatus,
      riskOrCaveat: parsed.riskOrCaveat || null,
      scoringVersion: SCORE_VERSION,
      previousFitScore: null,
      previousActivationScore: null,
      previousNetworkScore: null,
      previousPriorityScore: null,
      evidence: parsed.evidence.map((item, index) => ({ ...item, position: index + 1 })),
      scoreInputs,
    },
  };
}
