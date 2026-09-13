import { parse } from "csv-parse/sync";
import { z } from "zod";
import { canonicalizeUrl, cleanText, extractEmails, getDomain, normalizeIdentity } from "./normalize";
import { getSegmentGroup } from "./taxonomy";
import {
  candidateFactsSchema,
  DEFAULT_FACTS,
  FACT_CSV_HEADERS,
  FACT_SCORE_VERSION,
  calculateScores,
  scoreFacts,
  SCORE_DEFINITIONS,
  SCORE_KEYS,
  SCORE_VERSION,
  type CandidateFacts,
  type ContactChannel,
  type ScoreInputs,
} from "./scoring";
import { normalizeFunnelStatus, REAL_STATUS_OPTIONS, type FunnelStatus } from "./status";

const requiredText = z.string().trim().min(1);
const validUrl = z.string().url();
const FACTS_JSON_HEADER = "facts_json";

export const REQUIRED_HEADERS = [
  "candidate_id",
  "candidate_origin",
  "name",
  "brand_or_handle",
  "segment",
  "primary_platform_or_asset",
  "public_profile_url",
  "contact_type",
  "contact_source_url",
  "contact_value_public",
  "match_reason",
  "owned_audience_signal",
  "monetization_signal",
  "ai_affinity",
  "network_value_signal",
  "evidence_url_1",
  "evidence_summary_1",
  "verification_level",
  "verified_at",
  "funnel_status",
  "outreach_status",
] as const;

export type CandidateImportRecord = {
  candidateId: string;
  candidateOrigin: string;
  name: string;
  brandOrHandle: string;
  segment: string;
  segmentGroup: string;
  primaryPlatformOrAsset: string;
  publicProfileUrl: string;
  canonicalProfileUrl: string;
  contactType: string;
  contactSourceUrl: string;
  contactValuePublic: string;
  matchReason: string;
  ownedAudienceSignal: string;
  monetizationSignal: string;
  aiAffinity: string;
  networkValueSignal: string;
  verificationLevel: string;
  verifiedAt: string;
  funnelStatus: FunnelStatus;
  rawFunnelStatus: string;
  outreachStatus: string;
  riskOrCaveat: string | null;
  scoringVersion: string;
  scoreSource: "FACT_RULES" | "CSV_INPUT";
  facts: CandidateFacts | null;
  previousFitScore: number | null;
  previousActivationScore: number | null;
  previousNetworkScore: number | null;
  previousPriorityScore: number | null;
  evidence: Array<{ url: string; summary: string; position: number }>;
  scoreInputs: ScoreInputs;
};

export type ParsedImportRow = {
  rowNumber: number;
  record: CandidateImportRecord;
  computed: ReturnType<typeof calculateScores>;
  suppliedTotals: Partial<{
    fit: number;
    activation: number;
    network: number;
    priorityScore: number;
  }>;
  legacyScoreInputs: ScoreInputs | null;
};

export type InvalidImportRow = {
  rowNumber: number;
  candidateId: string;
  errors: string[];
};

export type ExistingIdentity = {
  id: number;
  candidateId: string;
  name: string;
  brandOrHandle: string;
  canonicalProfileUrl: string;
  emails: string[];
  domainHandle: string;
};

export type DuplicateMatch = {
  rowNumber: number;
  candidateId: string;
  existingCandidateId: string;
  kind: "exact" | "possible";
  matchedOn: "candidate_id" | "profile_url" | "email" | "domain_handle" | "name";
};

export type ScoreMismatch = {
  rowNumber: number;
  candidateId: string;
  kind: "component" | "total";
  field: string;
  supplied: number;
  computed: number;
};

export type ImportPreview = {
  rowsRead: number;
  validRows: ParsedImportRow[];
  invalidRows: InvalidImportRow[];
  duplicates: DuplicateMatch[];
  mismatches: ScoreMismatch[];
  parseError?: string;
};

function rowValue(row: Record<string, unknown>, key: string) {
  return cleanText(row[key]);
}

function readRequired(row: Record<string, unknown>, key: string, errors: string[]) {
  const value = rowValue(row, key);
  if (!requiredText.safeParse(value).success) errors.push(`${key} is required`);
  return value;
}

function readUrl(row: Record<string, unknown>, key: string, errors: string[]) {
  const value = readRequired(row, key, errors);
  if (value && !validUrl.safeParse(value).success) errors.push(`${key} must be a valid URL`);
  return value;
}

function readOptionalNumber(row: Record<string, unknown>, key: string, errors: string[]) {
  const value = rowValue(row, key);
  if (!value) return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    errors.push(`${key} must be a number`);
    return null;
  }
  return numberValue;
}

function readScoreInputs(row: Record<string, unknown>, errors: string[]) {
  const inputs = {} as ScoreInputs;
  for (const definition of SCORE_DEFINITIONS) {
    const value = rowValue(row, definition.key);
    const numberValue = Number(value);
    if (!value || !Number.isInteger(numberValue)) {
      errors.push(`${definition.key} must be an integer`);
      continue;
    }
    if (numberValue < 0 || numberValue > definition.max) {
      errors.push(`${definition.key} must be between 0 and ${definition.max}`);
      continue;
    }
    inputs[definition.key] = numberValue;
  }
  return inputs;
}

function readLegacyScoreInputs(row: Record<string, unknown>, errors: string[]) {
  const suppliedKeys = SCORE_KEYS.filter((key) => rowValue(row, key));
  if (!suppliedKeys.length) return null;
  if (suppliedKeys.length !== SCORE_KEYS.length) {
    errors.push("legacy score fields must include all 15 component scores when any are provided");
    return null;
  }
  return readScoreInputs(row, errors);
}

function readSuppliedTotals(row: Record<string, unknown>, errors: string[]) {
  const values: ParsedImportRow["suppliedTotals"] = {};
  const fields: Array<[string, keyof ParsedImportRow["suppliedTotals"]]> = [
    ["fit_score", "fit"],
    ["activation_score", "activation"],
    ["network_score", "network"],
    ["priority_score", "priorityScore"],
  ];
  for (const [field, outputKey] of fields) {
    const value = rowValue(row, field);
    if (!value) continue;
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) errors.push(`${field} must be a number`);
    else values[outputKey] = numberValue;
  }
  return values;
}

function readBooleanFact(row: Record<string, unknown>, key: string, fallback: boolean, errors: string[]) {
  const value = rowValue(row, key).toLowerCase();
  if (!value) return fallback;
  if (["true", "yes", "y", "1"].includes(value)) return true;
  if (["false", "no", "n", "0"].includes(value)) return false;
  errors.push(`${key} must be true/false`);
  return fallback;
}

function readFactNumber(row: Record<string, unknown>, key: string, fallback: number, errors: string[]) {
  const value = rowValue(row, key);
  if (!value) return fallback;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0 || numberValue > 10) {
    errors.push(`${key} must be an integer between 0 and 10`);
    return fallback;
  }
  return numberValue;
}

function readFactEnum<T extends string>(
  row: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  fallback: T,
  errors: string[],
) {
  const value = rowValue(row, key).toLowerCase() as T;
  if (!value) return fallback;
  if (allowed.includes(value)) return value;
  errors.push(`${key} must be one of ${allowed.join(", ")}`);
  return fallback;
}

function readContactChannels(row: Record<string, unknown>, errors: string[]) {
  const value = rowValue(row, "fact_contact_channels");
  if (!value) return [];
  const aliases: Record<string, ContactChannel> = {
    public_email: "public_email",
    email: "public_email",
    contact_form: "contact_form",
    form: "contact_form",
    social_dm: "social_dm",
    dm: "social_dm",
    agency_contact: "agency_contact",
    agency: "agency_contact",
  };
  const channels: ContactChannel[] = [];
  for (const item of value.split(/[|,;]/).map((part) => part.trim().toLowerCase()).filter(Boolean)) {
    const channel = aliases[item];
    if (!channel) errors.push(`fact_contact_channels has unsupported value: ${item}`);
    else if (!channels.includes(channel)) channels.push(channel);
  }
  return channels;
}

function readFacts(row: Record<string, unknown>, errors: string[]): CandidateFacts | null {
  const jsonText = rowValue(row, FACTS_JSON_HEADER);
  const hasExplicitFacts = FACT_CSV_HEADERS.some((header) => rowValue(row, header));
  if (!jsonText && !hasExplicitFacts) return null;
  if (jsonText && hasExplicitFacts) {
    errors.push("use either facts_json or fact_* CSV fields, not both");
    return null;
  }
  if (jsonText) {
    try {
      const parsed = candidateFactsSchema.safeParse(JSON.parse(jsonText));
      if (!parsed.success) errors.push(`facts_json is invalid: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
      return parsed.success ? parsed.data : null;
    } catch {
      errors.push("facts_json must contain valid JSON");
      return null;
    }
  }

  const facts: CandidateFacts = {
    ...DEFAULT_FACTS,
    contactChannels: readContactChannels(row, errors),
    ownedAudience: readBooleanFact(row, "fact_owned_audience", DEFAULT_FACTS.ownedAudience, errors),
    activePlatformCount: readFactNumber(row, "fact_active_platform_count", DEFAULT_FACTS.activePlatformCount, errors),
    contentFrequency: readFactEnum(row, "fact_content_frequency", ["unknown", "low", "medium", "high"] as const, DEFAULT_FACTS.contentFrequency, errors),
    newsletter: readBooleanFact(row, "fact_newsletter", DEFAULT_FACTS.newsletter, errors),
    community: readBooleanFact(row, "fact_community", DEFAULT_FACTS.community, errors),
    paidCommunity: readBooleanFact(row, "fact_paid_community", DEFAULT_FACTS.paidCommunity, errors),
    course: readBooleanFact(row, "fact_course", DEFAULT_FACTS.course, errors),
    coaching: readBooleanFact(row, "fact_coaching", DEFAULT_FACTS.coaching, errors),
    membership: readBooleanFact(row, "fact_membership", DEFAULT_FACTS.membership, errors),
    ecommerce: readBooleanFact(row, "fact_ecommerce", DEFAULT_FACTS.ecommerce, errors),
    affiliate: readBooleanFact(row, "fact_affiliate", DEFAULT_FACTS.affiliate, errors),
    brandDeal: readBooleanFact(row, "fact_brand_deal", DEFAULT_FACTS.brandDeal, errors),
    aiUsage: readBooleanFact(row, "fact_ai_usage", DEFAULT_FACTS.aiUsage, errors),
    aiNative: readBooleanFact(row, "fact_ai_native", DEFAULT_FACTS.aiNative, errors),
    virtualCreator: readBooleanFact(row, "fact_virtual_creator", DEFAULT_FACTS.virtualCreator, errors),
    teamSize: readFactEnum(row, "fact_team_size", ["unknown", "solo", "small", "mature", "enterprise"] as const, DEFAULT_FACTS.teamSize, errors),
    creatorEducator: readBooleanFact(row, "fact_creator_educator", DEFAULT_FACTS.creatorEducator, errors),
    managesCreators: readBooleanFact(row, "fact_manages_creators", DEFAULT_FACTS.managesCreators, errors),
    agencyOrStudio: readBooleanFact(row, "fact_agency_or_studio", DEFAULT_FACTS.agencyOrStudio, errors),
    creatorAudience: readBooleanFact(row, "fact_creator_audience", DEFAULT_FACTS.creatorAudience, errors),
    distributionChannelCount: readFactNumber(row, "fact_distribution_channel_count", DEFAULT_FACTS.distributionChannelCount, errors),
  };
  const parsed = candidateFactsSchema.safeParse(facts);
  if (!parsed.success) errors.push(`structured facts are invalid: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  return parsed.success ? parsed.data : null;
}

function parseRow(row: Record<string, unknown>, rowNumber: number):
  | { row: ParsedImportRow }
  | { invalid: InvalidImportRow } {
  const errors: string[] = [];
  const candidateId = readRequired(row, "candidate_id", errors);
  const candidateOrigin = readRequired(row, "candidate_origin", errors);
  const name = readRequired(row, "name", errors);
  const brandOrHandle = readRequired(row, "brand_or_handle", errors);
  const segment = readRequired(row, "segment", errors);
  const primaryPlatformOrAsset = readRequired(row, "primary_platform_or_asset", errors);
  const publicProfileUrl = readUrl(row, "public_profile_url", errors);
  const contactType = readRequired(row, "contact_type", errors);
  const contactSourceUrl = readUrl(row, "contact_source_url", errors);
  const contactValuePublic = readRequired(row, "contact_value_public", errors);
  const matchReason = readRequired(row, "match_reason", errors);
  const ownedAudienceSignal = readRequired(row, "owned_audience_signal", errors);
  const monetizationSignal = readRequired(row, "monetization_signal", errors);
  const aiAffinity = readRequired(row, "ai_affinity", errors);
  const networkValueSignal = readRequired(row, "network_value_signal", errors);
  const evidenceUrl1 = readUrl(row, "evidence_url_1", errors);
  const evidenceSummary1 = readRequired(row, "evidence_summary_1", errors);
  const evidenceUrl2 = rowValue(row, "evidence_url_2");
  const evidenceSummary2 = rowValue(row, "evidence_summary_2");
  if (Boolean(evidenceUrl2) !== Boolean(evidenceSummary2)) errors.push("evidence_url_2 and evidence_summary_2 must be provided together");
  if (evidenceUrl2 && !validUrl.safeParse(evidenceUrl2).success) errors.push("evidence_url_2 must be a valid URL");

  const verificationLevel = readRequired(row, "verification_level", errors);
  if (verificationLevel && !["A", "B", "C"].includes(verificationLevel)) errors.push("verification_level must be A, B, or C");
  const verifiedAt = readRequired(row, "verified_at", errors);
  if (verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)) errors.push("verified_at must be YYYY-MM-DD");
  const rawFunnelStatus = readRequired(row, "funnel_status", errors);
  let funnelStatus: FunnelStatus = "discovered";
  if (rawFunnelStatus) {
    try {
      funnelStatus = normalizeFunnelStatus(rawFunnelStatus);
      if (!REAL_STATUS_OPTIONS.includes(funnelStatus as (typeof REAL_STATUS_OPTIONS)[number])) errors.push("real CSV imports may only use pre-outreach funnel statuses");
    } catch {
      errors.push(`unsupported funnel_status: ${rawFunnelStatus}`);
    }
  }
  const outreachStatus = readRequired(row, "outreach_status", errors);
  const suppliedScoringVersion = rowValue(row, "scoring_version");
  if (suppliedScoringVersion && ![SCORE_VERSION, FACT_SCORE_VERSION].includes(suppliedScoringVersion)) {
    errors.push(`scoring_version must be ${SCORE_VERSION} or ${FACT_SCORE_VERSION}`);
  }

  const facts = readFacts(row, errors);
  const legacyScoreInputs = readLegacyScoreInputs(row, errors);
  const suppliedTotals = readSuppliedTotals(row, errors);
  if (!facts && !legacyScoreInputs) errors.push("provide structured public facts or all 15 legacy score fields");
  const evidence = [
    { url: evidenceUrl1, summary: evidenceSummary1, position: 1 },
    ...(evidenceUrl2 && evidenceSummary2 ? [{ url: evidenceUrl2, summary: evidenceSummary2, position: 2 }] : []),
  ];

  if (errors.length) return { invalid: { rowNumber, candidateId, errors: [...new Set(errors)] } };

  const factResult = facts ? scoreFacts(facts) : null;
  const scoreInputs = factResult?.inputs ?? legacyScoreInputs!;
  const computed = factResult?.scores ?? calculateScores(scoreInputs);
  const scoreSource = factResult ? "FACT_RULES" : "CSV_INPUT";
  const previousFitScore = readOptionalNumber(row, "previous_fit_score", errors);
  const previousActivationScore = readOptionalNumber(row, "previous_activation_score", errors);
  const previousNetworkScore = readOptionalNumber(row, "previous_network_score", errors);
  const previousPriorityScore = readOptionalNumber(row, "previous_priority_score", errors);
  if (errors.length) return { invalid: { rowNumber, candidateId, errors: [...new Set(errors)] } };

  const record: CandidateImportRecord = {
    candidateId,
    candidateOrigin,
    name,
    brandOrHandle,
    segment,
    segmentGroup: getSegmentGroup(segment),
    primaryPlatformOrAsset,
    publicProfileUrl,
    canonicalProfileUrl: canonicalizeUrl(publicProfileUrl),
    contactType,
    contactSourceUrl,
    contactValuePublic,
    matchReason,
    ownedAudienceSignal,
    monetizationSignal,
    aiAffinity,
    networkValueSignal,
    verificationLevel,
    verifiedAt,
    funnelStatus,
    rawFunnelStatus,
    outreachStatus,
    riskOrCaveat: rowValue(row, "risk_or_caveat") || null,
    scoringVersion: facts ? FACT_SCORE_VERSION : suppliedScoringVersion || SCORE_VERSION,
    scoreSource,
    facts,
    previousFitScore,
    previousActivationScore,
    previousNetworkScore,
    previousPriorityScore,
    evidence,
    scoreInputs,
  };

  return { row: { rowNumber, record, computed, suppliedTotals, legacyScoreInputs } };
}

function identityForRecord(record: CandidateImportRecord): ExistingIdentity {
  return {
    id: 0,
    candidateId: record.candidateId,
    name: record.name,
    brandOrHandle: record.brandOrHandle,
    canonicalProfileUrl: record.canonicalProfileUrl,
    emails: extractEmails(record.contactValuePublic),
    domainHandle: `${getDomain(record.publicProfileUrl)}:${normalizeIdentity(record.brandOrHandle)}`,
  };
}

function findMatch(record: CandidateImportRecord, existing: ExistingIdentity[]) {
  const incoming = identityForRecord(record);
  for (const candidate of existing) {
    if (candidate.candidateId === incoming.candidateId) return { candidate, matchedOn: "candidate_id" as const, kind: "exact" as const };
    if (candidate.canonicalProfileUrl === incoming.canonicalProfileUrl) return { candidate, matchedOn: "profile_url" as const, kind: "exact" as const };
    if (incoming.emails.some((email) => candidate.emails.includes(email))) return { candidate, matchedOn: "email" as const, kind: "exact" as const };
    if (incoming.domainHandle && candidate.domainHandle === incoming.domainHandle) return { candidate, matchedOn: "domain_handle" as const, kind: "exact" as const };
    if (normalizeIdentity(candidate.name) === normalizeIdentity(incoming.name)) return { candidate, matchedOn: "name" as const, kind: "possible" as const };
  }
  return null;
}

export function parseImportText(text: string): { rows: ParsedImportRow[]; invalidRows: InvalidImportRow[]; parseError?: string } {
  try {
    const records = parse(text, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: false,
    }) as Array<Record<string, unknown>>;
    const headers = Object.keys(records[0] ?? {});
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
      return { rows: [], invalidRows: [{ rowNumber: 1, candidateId: "", errors: [`missing headers: ${missingHeaders.join(", ")}`] }] };
    }
    const rows: ParsedImportRow[] = [];
    const invalidRows: InvalidImportRow[] = [];
    records.forEach((record, index) => {
      const result = parseRow(record, index + 2);
      if ("row" in result) rows.push(result.row);
      else invalidRows.push(result.invalid);
    });
    return { rows, invalidRows };
  } catch (error) {
    return { rows: [], invalidRows: [], parseError: error instanceof Error ? error.message : "Unable to parse CSV" };
  }
}

export function buildImportPreview(text: string, existing: ExistingIdentity[]): ImportPreview {
  const parsed = parseImportText(text);
  const duplicates: DuplicateMatch[] = [];
  const seen: ExistingIdentity[] = [];

  for (const row of parsed.rows) {
    const withinFileMatch = findMatch(row.record, seen);
    if (withinFileMatch) {
      duplicates.push({
        rowNumber: row.rowNumber,
        candidateId: row.record.candidateId,
        existingCandidateId: withinFileMatch.candidate.candidateId,
        kind: withinFileMatch.kind,
        matchedOn: withinFileMatch.matchedOn,
      });
    } else {
      seen.push(identityForRecord(row.record));
    }

    const existingMatch = findMatch(row.record, existing);
    if (existingMatch) {
      duplicates.push({
        rowNumber: row.rowNumber,
        candidateId: row.record.candidateId,
        existingCandidateId: existingMatch.candidate.candidateId,
        kind: existingMatch.kind,
        matchedOn: existingMatch.matchedOn,
      });
    }
  }

  const mismatches = parsed.rows.flatMap((row) => {
    const mismatchesForRow: ScoreMismatch[] = [];
    if (row.record.facts && row.legacyScoreInputs) {
      for (const key of SCORE_KEYS) {
        const supplied = row.legacyScoreInputs[key];
        const computed = row.record.scoreInputs[key];
        if (supplied !== computed) mismatchesForRow.push({ rowNumber: row.rowNumber, candidateId: row.record.candidateId, kind: "component", field: key, supplied, computed });
      }
    }
    for (const [key, supplied] of Object.entries(row.suppliedTotals)) {
      const computed = key === "priorityScore" ? row.computed.priorityScore : row.computed[key as "fit" | "activation" | "network"];
      if (computed !== supplied) mismatchesForRow.push({ rowNumber: row.rowNumber, candidateId: row.record.candidateId, kind: "total", field: key, supplied, computed });
    }
    return mismatchesForRow;
  });

  return {
    rowsRead: parsed.rows.length + parsed.invalidRows.length,
    validRows: parsed.rows,
    invalidRows: parsed.invalidRows,
    duplicates: duplicates.filter(
      (duplicate, index, list) => list.findIndex((item) => item.rowNumber === duplicate.rowNumber && item.existingCandidateId === duplicate.existingCandidateId && item.matchedOn === duplicate.matchedOn) === index,
    ),
    mismatches,
    ...(parsed.parseError ? { parseError: parsed.parseError } : {}),
  };
}
