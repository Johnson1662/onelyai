import fs from "node:fs";
import path from "node:path";
import { FACT_CSV_HEADERS, DEFAULT_FACTS, scoreFacts, SCORE_KEYS, type CandidateFacts } from "@/lib/scoring";
import { describe, expect, it } from "vitest";
import { buildImportPreview, parseImportText } from "@/lib/import";

const csv = fs.readFileSync(path.join(process.cwd(), "candidates", "onely_candidates_100_rescored_v2.csv"), "utf8");

function csvText(row: Record<string, string>) {
  const headers = Object.keys(row);
  const escape = (value: string) => /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return `${headers.join(",")}\n${headers.map((header) => escape(row[header] ?? "")).join(",")}\n`;
}

const baseRow: Record<string, string> = {
  candidate_id: "facts-001",
  candidate_origin: "test",
  name: "Facts Persona",
  brand_or_handle: "@facts-persona",
  segment: "Creator Entrepreneur",
  primary_platform_or_asset: "Newsletter + YouTube",
  public_profile_url: "https://example.com/facts-persona",
  contact_type: "Public business email",
  contact_source_url: "https://example.com/contact",
  contact_value_public: "hello@example.com",
  match_reason: "Public business and audience signals match the beta.",
  owned_audience_signal: "Newsletter is listed on the official site.",
  monetization_signal: "Course and membership are listed on the official site.",
  ai_affinity: "Uses AI in the public workflow.",
  network_value_signal: "Audience includes other creators.",
  evidence_url_1: "https://example.com/evidence",
  evidence_summary_1: "Official public page supports the recorded facts.",
  verification_level: "A",
  verified_at: "2026-09-13",
  funnel_status: "discovered",
  outreach_status: "not_contacted_case_restriction",
};

const testFacts: CandidateFacts = {
  ...DEFAULT_FACTS,
  ownedAudience: true,
  activePlatformCount: 3,
  contentFrequency: "high",
  newsletter: true,
  community: true,
  course: true,
  membership: true,
  contactChannels: ["public_email"],
  aiUsage: true,
  teamSize: "small",
  creatorEducator: true,
  creatorAudience: true,
  distributionChannelCount: 3,
};

function factColumns(facts: CandidateFacts) {
  return {
    fact_owned_audience: String(facts.ownedAudience),
    fact_active_platform_count: String(facts.activePlatformCount),
    fact_content_frequency: facts.contentFrequency,
    fact_newsletter: String(facts.newsletter),
    fact_community: String(facts.community),
    fact_paid_community: String(facts.paidCommunity),
    fact_course: String(facts.course),
    fact_coaching: String(facts.coaching),
    fact_membership: String(facts.membership),
    fact_ecommerce: String(facts.ecommerce),
    fact_affiliate: String(facts.affiliate),
    fact_brand_deal: String(facts.brandDeal),
    fact_contact_channels: facts.contactChannels.join("|"),
    fact_ai_usage: String(facts.aiUsage),
    fact_ai_native: String(facts.aiNative),
    fact_virtual_creator: String(facts.virtualCreator),
    fact_team_size: facts.teamSize,
    fact_creator_educator: String(facts.creatorEducator),
    fact_manages_creators: String(facts.managesCreators),
    fact_agency_or_studio: String(facts.agencyOrStudio),
    fact_creator_audience: String(facts.creatorAudience),
    fact_distribution_channel_count: String(facts.distributionChannelCount),
  } satisfies Record<(typeof FACT_CSV_HEADERS)[number], string>;
}

describe("candidate CSV import", () => {
  it("accepts the BOM encoded 100-row v2 dataset and recalculates every total", () => {
    const preview = buildImportPreview(csv, []);
    expect(preview.rowsRead).toBe(100);
    expect(preview.validRows).toHaveLength(100);
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.duplicates).toHaveLength(0);
    expect(preview.mismatches).toHaveLength(0);
    expect(preview.validRows[0].record.candidateId).toBe("001");
    expect(preview.validRows[0].record.scoreSource).toBe("CSV_INPUT");
  });

  it("reports missing score fields and malformed row data", () => {
    const firstLine = csv.split("\n")[0];
    const malformed = `${firstLine}\n001,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`;
    const parsed = parseImportText(malformed);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.invalidRows[0].errors.length).toBeGreaterThan(0);
  });

  it("scores a facts-only CSV without the legacy component columns", () => {
    const preview = buildImportPreview(csvText({ ...baseRow, ...factColumns(testFacts) }), []);
    const jsonPreview = buildImportPreview(csvText({ ...baseRow, candidate_id: "facts-json-001", facts_json: JSON.stringify(testFacts) }), []);
    const local = scoreFacts(testFacts);
    expect(preview.validRows).toHaveLength(1);
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.validRows[0].record.facts).toEqual(testFacts);
    expect(preview.validRows[0].record.scoreSource).toBe("FACT_RULES");
    expect(preview.validRows[0].computed).toEqual(local.scores);
    expect(jsonPreview.invalidRows).toHaveLength(0);
    expect(jsonPreview.validRows[0].record.facts).toEqual(testFacts);
  });

  it("compares optional legacy component and total fields with fact-rule results", () => {
    const local = scoreFacts(testFacts);
    const legacy = Object.fromEntries(SCORE_KEYS.map((key) => [key, String(local.inputs[key])])) as Record<string, string>;
    legacy.fit_audience = String(local.inputs.fit_audience - 1);
    const preview = buildImportPreview(csvText({
      ...baseRow,
      ...factColumns(testFacts),
      ...legacy,
      fit_score: String(local.scores.fit - 1),
      scoring_version: "v2.0-evidence-rubric-50-30-20",
    }), []);
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.mismatches).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "component", field: "fit_audience", supplied: local.inputs.fit_audience - 1, computed: local.inputs.fit_audience }),
      expect.objectContaining({ kind: "total", field: "fit", supplied: local.scores.fit - 1, computed: local.scores.fit }),
    ]));
  });
});
