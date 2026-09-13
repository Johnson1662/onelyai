import { getSqlite } from "@/db/client";
import { buildImportPreview, type CandidateImportRecord, type ExistingIdentity, type ImportPreview } from "./import";
import { canonicalizeUrl, extractEmails, getDomain, normalizeIdentity } from "./normalize";
import { calculateScores, candidateFactsSchema, getScoreDefinition, scoreFacts, SCORE_DEFINITIONS, type CandidateFacts, type ScoreInputs, type ScoreKey, type ScoreSignal } from "./scoring";
import { canChangeRealStatus, FUNNEL_STAGES, getStageIndex, isPositiveStage, type FunnelStatus } from "./status";

type SqlInput = null | number | bigint | string | NodeJS.ArrayBufferView;

export type CandidateRecord = {
  id: number;
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
  fitScore: number;
  activationScore: number;
  networkScore: number;
  priorityScore: number;
  priority: string;
  previousFitScore: number | null;
  previousActivationScore: number | null;
  previousNetworkScore: number | null;
  previousPriorityScore: number | null;
  discoverySource: string | null;
  riskOrCaveat: string | null;
  facts: CandidateFacts | null;
  scoringVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type ScoreComponentRecord = {
  id: number;
  scoreKey: ScoreKey;
  score: number;
  maxScore: number;
  initialScore: number;
  source: string;
  evidenceScope: string;
  overriddenAt: string | null;
};

export type EvidenceRecord = {
  id: number;
  scope: string;
  scoreKey: string | null;
  url: string;
  summary: string;
  position: number;
};

export type ActivityRecord = {
  id: number;
  candidateId: string | null;
  candidateName: string | null;
  action: string;
  field: string | null;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  actor: string;
  isDemo: boolean;
  createdAt: string;
};

export type CandidateDetail = {
  candidate: CandidateRecord;
  components: ScoreComponentRecord[];
  evidence: EvidenceRecord[];
  scoreSignals: ScoreSignal[];
  activity: ActivityRecord[];
};

export type CandidateFilters = {
  search?: string;
  segmentGroup?: string;
  priority?: string;
  verification?: string;
  funnelStatus?: string;
  outreachStatus?: string;
  aiAffinity?: string;
  hasEmail?: boolean;
  fitMin?: number;
  fitMax?: number;
  activationMin?: number;
  activationMax?: number;
  networkMin?: number;
  networkMax?: number;
  sort?: "priority" | "fit" | "activation" | "network" | "name";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

type CandidateSqlRow = {
  id: number;
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
  fitScore: number;
  activationScore: number;
  networkScore: number;
  priorityScore: number;
  priority: string;
  previousFitScore: number | null;
  previousActivationScore: number | null;
  previousNetworkScore: number | null;
  previousPriorityScore: number | null;
  discoverySource: string | null;
  riskOrCaveat: string | null;
  factsJson: string | null;
  scoringVersion: string;
  createdAt: string;
  updatedAt: string;
};

const CANDIDATE_COLUMNS = `
  id,
  candidate_id AS candidateId,
  candidate_origin AS candidateOrigin,
  name,
  brand_or_handle AS brandOrHandle,
  segment,
  segment_group AS segmentGroup,
  primary_platform_or_asset AS primaryPlatformOrAsset,
  public_profile_url AS publicProfileUrl,
  canonical_profile_url AS canonicalProfileUrl,
  contact_type AS contactType,
  contact_source_url AS contactSourceUrl,
  contact_value_public AS contactValuePublic,
  match_reason AS matchReason,
  owned_audience_signal AS ownedAudienceSignal,
  monetization_signal AS monetizationSignal,
  ai_affinity AS aiAffinity,
  network_value_signal AS networkValueSignal,
  verification_level AS verificationLevel,
  verified_at AS verifiedAt,
  funnel_status AS funnelStatus,
  raw_funnel_status AS rawFunnelStatus,
  outreach_status AS outreachStatus,
  fit_score AS fitScore,
  activation_score AS activationScore,
  network_score AS networkScore,
  priority_score AS priorityScore,
  priority,
  previous_fit_score AS previousFitScore,
  previous_activation_score AS previousActivationScore,
  previous_network_score AS previousNetworkScore,
  previous_priority_score AS previousPriorityScore,
  discovery_source AS discoverySource,
  risk_or_caveat AS riskOrCaveat,
  facts_json AS factsJson,
  scoring_version AS scoringVersion,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

function now() {
  return new Date().toISOString();
}

function withTransaction<T>(sqlite: ReturnType<typeof getSqlite>, action: () => T) {
  sqlite.exec("BEGIN");
  try {
    const result = action();
    sqlite.exec("COMMIT");
    return result;
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  }
}

function parseFacts(value: string | null) {
  if (!value) return null;
  try {
    const parsed = candidateFactsSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function mapCandidate(row: CandidateSqlRow): CandidateRecord {
  const { factsJson, ...candidate } = row;
  return { ...candidate, facts: parseFacts(factsJson) };
}

function mapActivity(row: Record<string, unknown>): ActivityRecord {
  return {
    id: Number(row.id),
    candidateId: (row.candidateId as string | null) ?? null,
    candidateName: (row.candidateName as string | null) ?? null,
    action: String(row.action),
    field: (row.field as string | null) ?? null,
    previousValue: (row.previousValue as string | null) ?? null,
    newValue: (row.newValue as string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
    actor: String(row.actor),
    isDemo: Boolean(row.isDemo),
    createdAt: String(row.createdAt),
  };
}

function clampPage(value: number | undefined, fallback: number, maximum: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value as number), 1), maximum);
}

function buildCandidateWhere(filters: CandidateFilters) {
  const clauses: string[] = [];
  const params: SqlInput[] = [];
  const add = (clause: string, ...values: SqlInput[]) => {
    clauses.push(clause);
    params.push(...values);
  };

  const search = filters.search?.trim();
  if (search) {
    const term = `%${search}%`;
    add(
      `(lower(name) LIKE lower(?) OR lower(brand_or_handle) LIKE lower(?) OR lower(contact_value_public) LIKE lower(?))`,
      term,
      term,
      term,
    );
  }
  if (filters.segmentGroup) add("segment_group = ?", filters.segmentGroup);
  if (filters.priority) add("priority = ?", filters.priority);
  if (filters.verification) add("verification_level = ?", filters.verification);
  if (filters.funnelStatus) add("funnel_status = ?", filters.funnelStatus);
  if (filters.outreachStatus) add("outreach_status = ?", filters.outreachStatus);
  if (filters.aiAffinity) add("ai_affinity = ?", filters.aiAffinity);
  if (filters.hasEmail) add("contact_value_public LIKE '%@%'");
  if (Number.isFinite(filters.fitMin)) add("fit_score >= ?", filters.fitMin as number);
  if (Number.isFinite(filters.fitMax)) add("fit_score <= ?", filters.fitMax as number);
  if (Number.isFinite(filters.activationMin)) add("activation_score >= ?", filters.activationMin as number);
  if (Number.isFinite(filters.activationMax)) add("activation_score <= ?", filters.activationMax as number);
  if (Number.isFinite(filters.networkMin)) add("network_score >= ?", filters.networkMin as number);
  if (Number.isFinite(filters.networkMax)) add("network_score <= ?", filters.networkMax as number);

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export function listCandidates(filters: CandidateFilters = {}) {
  const sqlite = getSqlite();
  const { where, params } = buildCandidateWhere(filters);
  const sortMap = {
    priority: "priority_score",
    fit: "fit_score",
    activation: "activation_score",
    network: "network_score",
    name: "lower(name)",
  } as const;
  const sort = sortMap[filters.sort ?? "priority"];
  const order = filters.order === "asc" ? "ASC" : "DESC";
  const pageSize = clampPage(filters.pageSize, 25, 100);
  const page = clampPage(filters.page, 1, 100000);
  const offset = (page - 1) * pageSize;
  const rows = sqlite
    .prepare(`SELECT ${CANDIDATE_COLUMNS} FROM candidates ${where} ORDER BY ${sort} ${order}, fit_score DESC, candidate_id ASC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset) as CandidateSqlRow[];
  const totalRow = sqlite.prepare(`SELECT COUNT(*) AS count FROM candidates ${where}`).get(...params) as { count: number };
  return { rows: rows.map(mapCandidate), total: Number(totalRow.count), page, pageSize };
}

export function listAllCandidates() {
  return (getSqlite()
    .prepare(`SELECT ${CANDIDATE_COLUMNS} FROM candidates ORDER BY priority_score DESC, fit_score DESC, candidate_id ASC`)
    .all() as CandidateSqlRow[]).map(mapCandidate);
}

export function getCandidate(candidateId: string) {
  const sqlite = getSqlite();
  const candidate = sqlite
    .prepare(`SELECT ${CANDIDATE_COLUMNS} FROM candidates WHERE candidate_id = ?`)
    .get(candidateId) as CandidateSqlRow | undefined;
  if (!candidate) return null;
  const components = sqlite
    .prepare(`SELECT id, score_key AS scoreKey, score, max_score AS maxScore, initial_score AS initialScore, source, evidence_scope AS evidenceScope, overridden_at AS overriddenAt FROM score_components WHERE candidate_id = ? ORDER BY id`)
    .all(candidate.id) as ScoreComponentRecord[];
  const evidence = sqlite
    .prepare(`SELECT id, scope, score_key AS scoreKey, url, summary, position FROM evidence WHERE candidate_id = ? ORDER BY position, id`)
    .all(candidate.id) as EvidenceRecord[];
  const activity = getActivity(100, candidateId);
  const mappedCandidate = mapCandidate(candidate);
  return {
    candidate: mappedCandidate,
    components,
    evidence,
    scoreSignals: mappedCandidate.facts ? scoreFacts(mappedCandidate.facts).signals : [],
    activity,
  } satisfies CandidateDetail;
}

export function getCandidateIdentities(): ExistingIdentity[] {
  const rows = getSqlite()
    .prepare(`SELECT id, candidate_id AS candidateId, name, brand_or_handle AS brandOrHandle, canonical_profile_url AS canonicalProfileUrl, contact_value_public AS contactValuePublic, public_profile_url AS publicProfileUrl FROM candidates`)
    .all() as Array<{
    id: number;
    candidateId: string;
    name: string;
    brandOrHandle: string;
    canonicalProfileUrl: string;
    contactValuePublic: string;
    publicProfileUrl: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    candidateId: row.candidateId,
    name: row.name,
    brandOrHandle: row.brandOrHandle,
    canonicalProfileUrl: row.canonicalProfileUrl,
    emails: extractEmails(row.contactValuePublic),
    domainHandle: `${getDomain(row.publicProfileUrl)}:${normalizeIdentity(row.brandOrHandle)}`,
  }));
}

function insertRecord(
  sqlite: ReturnType<typeof getSqlite>,
  record: CandidateImportRecord,
  actor: string,
  action: string,
  source = "CSV_INPUT",
) {
  const timestamp = now();
  const computed = calculateScores(record.scoreInputs);
  const candidateInsert = sqlite.prepare(`
    INSERT INTO candidates (
      candidate_id, candidate_origin, name, brand_or_handle, segment, segment_group,
      primary_platform_or_asset, public_profile_url, canonical_profile_url,
      contact_type, contact_source_url, contact_value_public, match_reason,
      owned_audience_signal, monetization_signal, ai_affinity, network_value_signal,
      verification_level, verified_at, funnel_status, raw_funnel_status, outreach_status,
      fit_score, activation_score, network_score, priority_score, priority,
      previous_fit_score, previous_activation_score, previous_network_score,
      previous_priority_score, discovery_source, risk_or_caveat, facts_json, scoring_version,
      created_at, updated_at
    ) VALUES (
      @candidateId, @candidateOrigin, @name, @brandOrHandle, @segment, @segmentGroup,
      @primaryPlatformOrAsset, @publicProfileUrl, @canonicalProfileUrl,
      @contactType, @contactSourceUrl, @contactValuePublic, @matchReason,
      @ownedAudienceSignal, @monetizationSignal, @aiAffinity, @networkValueSignal,
      @verificationLevel, @verifiedAt, @funnelStatus, @rawFunnelStatus, @outreachStatus,
      @fitScore, @activationScore, @networkScore, @priorityScore, @priority,
      @previousFitScore, @previousActivationScore, @previousNetworkScore,
      @previousPriorityScore, @discoverySource, @riskOrCaveat, @factsJson, @scoringVersion,
      @createdAt, @updatedAt
    )
  `);
  const result = candidateInsert.run({
    candidateId: record.candidateId,
    candidateOrigin: record.candidateOrigin,
    name: record.name,
    brandOrHandle: record.brandOrHandle,
    segment: record.segment,
    segmentGroup: record.segmentGroup,
    primaryPlatformOrAsset: record.primaryPlatformOrAsset,
    publicProfileUrl: record.publicProfileUrl,
    canonicalProfileUrl: record.canonicalProfileUrl,
    contactType: record.contactType,
    contactSourceUrl: record.contactSourceUrl,
    contactValuePublic: record.contactValuePublic,
    matchReason: record.matchReason,
    ownedAudienceSignal: record.ownedAudienceSignal,
    monetizationSignal: record.monetizationSignal,
    aiAffinity: record.aiAffinity,
    networkValueSignal: record.networkValueSignal,
    verificationLevel: record.verificationLevel,
    verifiedAt: record.verifiedAt,
    funnelStatus: record.funnelStatus,
    rawFunnelStatus: record.rawFunnelStatus,
    outreachStatus: record.outreachStatus,
    fitScore: computed.fit,
    activationScore: computed.activation,
    networkScore: computed.network,
    priorityScore: computed.priorityScore,
    priority: computed.priority,
    previousFitScore: record.previousFitScore,
    previousActivationScore: record.previousActivationScore,
    previousNetworkScore: record.previousNetworkScore,
    previousPriorityScore: record.previousPriorityScore,
    discoverySource: null,
    riskOrCaveat: record.riskOrCaveat,
    factsJson: record.facts ? JSON.stringify(record.facts) : null,
    scoringVersion: record.scoringVersion,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const candidateDbId = Number(result.lastInsertRowid);
  const componentInsert = sqlite.prepare(`INSERT INTO score_components (candidate_id, score_key, score, max_score, initial_score, source, evidence_scope, overridden_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`);
  for (const definition of SCORE_DEFINITIONS) {
    componentInsert.run(
      candidateDbId,
      definition.key,
      record.scoreInputs[definition.key],
      definition.max,
      record.scoreInputs[definition.key],
      source,
      "candidate",
    );
  }
  const evidenceInsert = sqlite.prepare(`INSERT INTO evidence (candidate_id, scope, score_key, url, summary, position, created_at) VALUES (?, 'candidate', NULL, ?, ?, ?, ?)`);
  for (const item of record.evidence) evidenceInsert.run(candidateDbId, item.url, item.summary, item.position, timestamp);
  const auditInsert = sqlite.prepare(`INSERT INTO audit_logs (candidate_id, action, field, previous_value, new_value, reason, actor, is_demo, created_at) VALUES (?, ?, NULL, NULL, ?, NULL, ?, 0, ?)`);
  auditInsert.run(candidateDbId, action, record.scoringVersion, actor, timestamp);
  return candidateDbId;
}

function replaceRecord(sqlite: ReturnType<typeof getSqlite>, existingId: number, record: CandidateImportRecord, actor: string) {
  const timestamp = now();
  const computed = calculateScores(record.scoreInputs);
  sqlite.prepare(`
    UPDATE candidates SET
      candidate_origin = @candidateOrigin, name = @name, brand_or_handle = @brandOrHandle,
      segment = @segment, segment_group = @segmentGroup, primary_platform_or_asset = @primaryPlatformOrAsset,
      public_profile_url = @publicProfileUrl, canonical_profile_url = @canonicalProfileUrl,
      contact_type = @contactType, contact_source_url = @contactSourceUrl, contact_value_public = @contactValuePublic,
      match_reason = @matchReason, owned_audience_signal = @ownedAudienceSignal,
      monetization_signal = @monetizationSignal, ai_affinity = @aiAffinity, network_value_signal = @networkValueSignal,
      verification_level = @verificationLevel, verified_at = @verifiedAt, funnel_status = @funnelStatus,
      raw_funnel_status = @rawFunnelStatus, outreach_status = @outreachStatus,
      fit_score = @fitScore, activation_score = @activationScore, network_score = @networkScore,
      priority_score = @priorityScore, priority = @priority,
      previous_fit_score = @previousFitScore, previous_activation_score = @previousActivationScore,
      previous_network_score = @previousNetworkScore, previous_priority_score = @previousPriorityScore,
      risk_or_caveat = @riskOrCaveat, facts_json = @factsJson, scoring_version = @scoringVersion, updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id: existingId,
    candidateOrigin: record.candidateOrigin,
    name: record.name,
    brandOrHandle: record.brandOrHandle,
    segment: record.segment,
    segmentGroup: record.segmentGroup,
    primaryPlatformOrAsset: record.primaryPlatformOrAsset,
    publicProfileUrl: record.publicProfileUrl,
    canonicalProfileUrl: record.canonicalProfileUrl,
    contactType: record.contactType,
    contactSourceUrl: record.contactSourceUrl,
    contactValuePublic: record.contactValuePublic,
    matchReason: record.matchReason,
    ownedAudienceSignal: record.ownedAudienceSignal,
    monetizationSignal: record.monetizationSignal,
    aiAffinity: record.aiAffinity,
    networkValueSignal: record.networkValueSignal,
    verificationLevel: record.verificationLevel,
    verifiedAt: record.verifiedAt,
    funnelStatus: record.funnelStatus,
    rawFunnelStatus: record.rawFunnelStatus,
    outreachStatus: record.outreachStatus,
    fitScore: computed.fit,
    activationScore: computed.activation,
    networkScore: computed.network,
    priorityScore: computed.priorityScore,
    priority: computed.priority,
    previousFitScore: record.previousFitScore,
    previousActivationScore: record.previousActivationScore,
    previousNetworkScore: record.previousNetworkScore,
    previousPriorityScore: record.previousPriorityScore,
    riskOrCaveat: record.riskOrCaveat,
    factsJson: record.facts ? JSON.stringify(record.facts) : null,
    scoringVersion: record.scoringVersion,
    updatedAt: timestamp,
  });
  sqlite.prepare(`DELETE FROM score_components WHERE candidate_id = ?`).run(existingId);
  sqlite.prepare(`DELETE FROM evidence WHERE candidate_id = ?`).run(existingId);
  const componentInsert = sqlite.prepare(`INSERT INTO score_components (candidate_id, score_key, score, max_score, initial_score, source, evidence_scope, overridden_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`);
  for (const definition of SCORE_DEFINITIONS) {
    componentInsert.run(existingId, definition.key, record.scoreInputs[definition.key], definition.max, record.scoreInputs[definition.key], record.scoreSource, "candidate");
  }
  const evidenceInsert = sqlite.prepare(`INSERT INTO evidence (candidate_id, scope, score_key, url, summary, position, created_at) VALUES (?, 'candidate', NULL, ?, ?, ?, ?)`);
  for (const item of record.evidence) evidenceInsert.run(existingId, item.url, item.summary, item.position, timestamp);
  sqlite.prepare(`INSERT INTO audit_logs (candidate_id, action, field, previous_value, new_value, reason, actor, is_demo, created_at) VALUES (?, 'duplicate_resolved', 'candidate', 'existing', 'replaced', 'CSV replace_existing', ?, 0, ?)`).run(existingId, actor, timestamp);
}

export type ImportCommitReport = {
  rowsRead: number;
  imported: number;
  skipped: number;
  duplicated: number;
  invalid: number;
  mismatches: ImportPreview["mismatches"];
  invalidRows: ImportPreview["invalidRows"];
};

export function previewImport(text: string) {
  return buildImportPreview(text, getCandidateIdentities());
}

export function commitImport(text: string, resolution: "keep_existing" | "replace_existing" = "keep_existing"): ImportCommitReport {
  const preview = previewImport(text);
  if (preview.parseError) throw new Error(preview.parseError);
  const exactOrPossibleByRow = new Map<number, (typeof preview.duplicates)[number]>();
  for (const duplicate of preview.duplicates) {
    if (!exactOrPossibleByRow.has(duplicate.rowNumber) || duplicate.kind === "exact") exactOrPossibleByRow.set(duplicate.rowNumber, duplicate);
  }
  const identities = getCandidateIdentities();
  const sqlite = getSqlite();
  let imported = 0;
  let skipped = 0;
  withTransaction(sqlite, () => {
    for (const parsed of preview.validRows) {
      const duplicate = exactOrPossibleByRow.get(parsed.rowNumber);
      if (duplicate) {
        const existing = identities.find((item) => item.candidateId === duplicate.existingCandidateId);
        if (resolution !== "replace_existing" || duplicate.kind !== "exact" || !existing || existing.candidateId !== parsed.record.candidateId) {
          skipped += 1;
          continue;
        }
        replaceRecord(sqlite, existing.id, parsed.record, "human");
        imported += 1;
        continue;
      }
      insertRecord(sqlite, parsed.record, "system", "candidate_imported", parsed.record.scoreSource);
      imported += 1;
    }
  });
  return {
    rowsRead: preview.rowsRead,
    imported,
    skipped,
    duplicated: preview.duplicates.length,
    invalid: preview.invalidRows.length,
    mismatches: preview.mismatches,
    invalidRows: preview.invalidRows,
  };
}

export function createCandidate(record: CandidateImportRecord, discoveryId?: number) {
  const sqlite = getSqlite();
  withTransaction(sqlite, () => {
    const source = record.scoreSource === "FACT_RULES" ? "FACT_RULES" : "MANUAL_INPUT";
    const id = insertRecord(sqlite, record, "human", "candidate_created", source);
    if (discoveryId) {
      sqlite.prepare(`UPDATE discovery_items SET status = 'imported', promoted_candidate_id = ?, updated_at = ? WHERE id = ?`).run(id, now(), discoveryId);
    }
    return id;
  });
  const candidate = getCandidate(record.candidateId);
  if (!candidate) throw new Error(`Created candidate ${record.candidateId} could not be reloaded`);
  return candidate;
}

function getCandidateDbId(candidateId: string) {
  const row = getSqlite().prepare(`SELECT id FROM candidates WHERE candidate_id = ?`).get(candidateId) as { id: number } | undefined;
  return row?.id ?? null;
}

export function overrideScore(candidateId: string, scoreKey: string, score: number, reason: string) {
  const definition = getScoreDefinition(scoreKey);
  if (!definition) throw new Error("Unknown score component");
  if (!Number.isInteger(score) || score < 0 || score > definition.max) throw new Error(`Score must be an integer between 0 and ${definition.max}`);
  if (reason.trim().length < 5) throw new Error("A reason of at least 5 characters is required");
  const sqlite = getSqlite();
  const candidateDbId = getCandidateDbId(candidateId);
  if (!candidateDbId) throw new Error("Candidate not found");
  withTransaction(sqlite, () => {
    const component = sqlite.prepare(`SELECT score, initial_score AS initialScore FROM score_components WHERE candidate_id = ? AND score_key = ?`).get(candidateDbId, scoreKey) as { score: number; initialScore: number } | undefined;
    if (!component) throw new Error("Score component not found");
    sqlite.prepare(`UPDATE score_components SET score = ?, source = 'HUMAN_OVERRIDE', overridden_at = ? WHERE candidate_id = ? AND score_key = ?`).run(score, now(), candidateDbId, scoreKey);
    const components = sqlite.prepare(`SELECT score_key AS scoreKey, score FROM score_components WHERE candidate_id = ?`).all(candidateDbId) as Array<{ scoreKey: ScoreKey; score: number }>;
    const inputs = {} as ScoreInputs;
    for (const item of components) inputs[item.scoreKey] = item.score;
    const computed = calculateScores(inputs);
    sqlite.prepare(`UPDATE candidates SET fit_score = ?, activation_score = ?, network_score = ?, priority_score = ?, priority = ?, updated_at = ? WHERE id = ?`).run(computed.fit, computed.activation, computed.network, computed.priorityScore, computed.priority, now(), candidateDbId);
    sqlite.prepare(`INSERT INTO audit_logs (candidate_id, action, field, previous_value, new_value, reason, actor, is_demo, created_at) VALUES (?, 'human_score_override', ?, ?, ?, ?, 'human', 0, ?)`).run(candidateDbId, scoreKey, String(component.score), String(score), reason.trim(), now());
  });
  return getCandidate(candidateId);
}

export function changeStatus(candidateId: string, nextStatus: string, reason?: string) {
  const sqlite = getSqlite();
  const current = getCandidate(candidateId);
  if (!current) throw new Error("Candidate not found");
  if (!canChangeRealStatus(current.candidate.funnelStatus, nextStatus)) {
    throw new Error("Real candidates may only move through pre-outreach statuses; contacted and later stages are demo-only");
  }
  const timestamp = now();
  sqlite.prepare(`UPDATE candidates SET funnel_status = ?, updated_at = ? WHERE id = ?`).run(nextStatus, timestamp, current.candidate.id);
  sqlite.prepare(`INSERT INTO audit_logs (candidate_id, action, field, previous_value, new_value, reason, actor, is_demo, created_at) VALUES (?, 'status_changed', 'funnel_status', ?, ?, ?, 'human', 0, ?)`).run(current.candidate.id, current.candidate.funnelStatus, nextStatus, reason?.trim() || null, timestamp);
  return getCandidate(candidateId);
}

export function getActivity(limit = 100, candidateId?: string) {
  const sqlite = getSqlite();
  const safeLimit = clampPage(limit, 100, 500);
  const params: SqlInput[] = [];
  let where = "";
  if (candidateId) {
    where = "WHERE c.candidate_id = ?";
    params.push(candidateId);
  }
  const rows = sqlite.prepare(`
    SELECT a.id, c.candidate_id AS candidateId, c.name AS candidateName,
      a.action, a.field, a.previous_value AS previousValue, a.new_value AS newValue,
      a.reason, a.actor, a.is_demo AS isDemo, a.created_at AS createdAt
    FROM audit_logs a LEFT JOIN candidates c ON c.id = a.candidate_id
    ${where} ORDER BY a.created_at DESC, a.id DESC LIMIT ?
  `).all(...params, safeLimit) as Array<Record<string, unknown>>;
  return rows.map(mapActivity);
}

export type DashboardData = {
  mode: "real" | "demo";
  loaded: boolean;
  metrics: Record<string, number>;
  funnel: Array<{ stage: string; count: number; conversion: number | null; overall: number }>;
  segmentBreakdown: Array<{ name: string; total: number; verified: number; activated: number }>;
  sourceBreakdown: Array<{ name: string; total: number; verified: number; activated: number }>;
  priorityBreakdown: Array<{ name: string; count: number }>;
  recentActivity: ActivityRecord[];
};

function cumulativeCount(status: string, stage: string) {
  if (!isPositiveStage(status)) return 0;
  return getStageIndex(status) >= getStageIndex(stage) ? 1 : 0;
}

export function getDashboard(mode: "real" | "demo" = "real"): DashboardData {
  const candidates = listAllCandidates();
  let statusById = new Map<number, string>();
  let loaded = mode === "real";
  if (mode === "real") {
    statusById = new Map(candidates.map((candidate) => [candidate.id, candidate.funnelStatus]));
  } else {
    const rows = getSqlite().prepare(`SELECT candidate_id AS candidateId, simulated_status AS simulatedStatus FROM demo_funnel_states`).all() as Array<{ candidateId: number; simulatedStatus: string }>;
    loaded = rows.length > 0;
    statusById = new Map(rows.map((row) => [row.candidateId, row.simulatedStatus]));
  }
  const activeCandidates = mode === "real" ? candidates : candidates.filter((candidate) => statusById.has(candidate.id));
  const funnel = FUNNEL_STAGES.map((stage, index) => {
    const count = activeCandidates.reduce((total, candidate) => total + cumulativeCount(statusById.get(candidate.id) ?? "", stage), 0);
    const previous = index === 0 ? activeCandidates.length : activeCandidates.reduce((total, candidate) => total + cumulativeCount(statusById.get(candidate.id) ?? "", FUNNEL_STAGES[index - 1]), 0);
    return {
      stage,
      count,
      conversion: previous ? Math.round((count / previous) * 1000) / 10 : null,
      overall: activeCandidates.length ? Math.round((count / activeCandidates.length) * 1000) / 10 : 0,
    };
  });
  const stageCount = (stage: string) => funnel.find((item) => item.stage === stage)?.count ?? 0;
  const metrics = {
    total: activeCandidates.length,
    verified: stageCount("verified"),
    readyForOutreach: stageCount("ready_for_outreach"),
    contacted: stageCount("contacted"),
    replied: stageCount("replied"),
    interested: stageCount("interested"),
    signedUp: stageCount("signed_up"),
    activated: stageCount("activated"),
  };
  const breakdown = (key: (candidate: CandidateRecord) => string) => {
    const groups = new Map<string, CandidateRecord[]>();
    for (const candidate of activeCandidates) {
      const name = key(candidate);
      groups.set(name, [...(groups.get(name) ?? []), candidate]);
    }
    return [...groups.entries()]
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([name, group]) => ({
        name,
        total: group.length,
        verified: group.reduce((total, candidate) => total + cumulativeCount(statusById.get(candidate.id) ?? "", "verified"), 0),
        activated: group.reduce((total, candidate) => total + cumulativeCount(statusById.get(candidate.id) ?? "", "activated"), 0),
      }));
  };
  const priorityCounts = new Map<string, number>();
  for (const candidate of activeCandidates) priorityCounts.set(candidate.priority, (priorityCounts.get(candidate.priority) ?? 0) + 1);
  const priorityBreakdown = ["P0", "P1", "P2", "P3"].map((name) => ({ name, count: priorityCounts.get(name) ?? 0 }));
  return {
    mode,
    loaded,
    metrics,
    funnel,
    segmentBreakdown: breakdown((candidate) => candidate.segmentGroup),
    sourceBreakdown: breakdown((candidate) => candidate.discoverySource ?? candidate.candidateOrigin),
    priorityBreakdown,
    recentActivity: getActivity(8),
  };
}

export function loadDemoFunnel() {
  const candidates = listAllCandidates();
  const statuses = (index: number): FunnelStatus => {
    if (index === 0) return "activated";
    if (index < 3) return "signed_up";
    if (index < 6) return "interested";
    if (index < 12) return "replied";
    if (index < 22) return "contacted";
    return "ready_for_outreach";
  };
  const sqlite = getSqlite();
  const timestamp = now();
  withTransaction(sqlite, () => {
    sqlite.prepare(`DELETE FROM demo_funnel_states`).run();
    const insert = sqlite.prepare(`INSERT INTO demo_funnel_states (candidate_id, simulated_status, loaded_at) VALUES (?, ?, ?)`);
    for (const [index, candidate] of candidates.entries()) insert.run(candidate.id, statuses(index), timestamp);
    sqlite.prepare(`INSERT INTO audit_logs (candidate_id, action, field, previous_value, new_value, reason, actor, is_demo, created_at) VALUES (NULL, 'demo_funnel_loaded', NULL, NULL, 'loaded', 'Synthetic funnel for product demonstration', 'system', 1, ?)`).run(timestamp);
  });
  return getDashboard("demo");
}

export function resetDemoFunnel() {
  const sqlite = getSqlite();
  const timestamp = now();
  withTransaction(sqlite, () => {
    sqlite.prepare(`DELETE FROM demo_funnel_states`).run();
    sqlite.prepare(`INSERT INTO audit_logs (candidate_id, action, field, previous_value, new_value, reason, actor, is_demo, created_at) VALUES (NULL, 'demo_funnel_reset', NULL, 'loaded', 'empty', 'Synthetic funnel cleared', 'system', 1, ?)`).run(timestamp);
  });
  return getDashboard("demo");
}

export type DiscoveryRecord = {
  id: number;
  url: string;
  canonicalUrl: string;
  source: string;
  query: string | null;
  notes: string | null;
  status: string;
  promotedCandidateId: number | null;
  createdAt: string;
  updatedAt: string;
};

export function listDiscovery() {
  return getSqlite().prepare(`SELECT id, url, canonical_url AS canonicalUrl, source, query, notes, status, promoted_candidate_id AS promotedCandidateId, created_at AS createdAt, updated_at AS updatedAt FROM discovery_items ORDER BY created_at DESC, id DESC`).all() as DiscoveryRecord[];
}

export function addDiscovery(input: { url: string; source: string; query?: string; notes?: string }) {
  const timestamp = now();
  const url = input.url.trim();
  const canonicalUrl = canonicalizeUrl(url);
  const result = getSqlite().prepare(`INSERT INTO discovery_items (url, canonical_url, source, query, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'new', ?, ?)`).run(url, canonicalUrl, input.source.trim(), input.query?.trim() || null, input.notes?.trim() || null, timestamp, timestamp);
  return listDiscovery().find((item) => item.id === Number(result.lastInsertRowid)) ?? null;
}

export function markDiscoveryReview(id: number, status: "reviewing" | "qualified" | "rejected") {
  getSqlite().prepare(`UPDATE discovery_items SET status = ?, updated_at = ? WHERE id = ?`).run(status, now(), id);
  return listDiscovery().find((item) => item.id === id) ?? null;
}
