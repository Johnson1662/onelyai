import { z } from "zod";

export const SCORE_VERSION = "v2.0-evidence-rubric-50-30-20";
export const FACT_SCORE_VERSION = "v2.1-public-facts-rules-50-30-20";

export const SCORE_DEFINITIONS = [
  { key: "fit_audience", category: "Fit", label: "Audience Ownership", max: 20 },
  { key: "fit_monetization", category: "Fit", label: "Owned Monetization", max: 20 },
  { key: "fit_multiplatform", category: "Fit", label: "Multi-platform", max: 15 },
  { key: "fit_content_pressure", category: "Fit", label: "Content Pressure", max: 15 },
  { key: "fit_fan_relationship", category: "Fit", label: "Fan Relationship", max: 15 },
  { key: "fit_ai_affinity", category: "Fit", label: "AI Affinity", max: 15 },
  { key: "act_reachability", category: "Activation", label: "Reachability", max: 25 },
  { key: "act_early_adopter", category: "Activation", label: "Early Adopter", max: 20 },
  { key: "act_switching_ease", category: "Activation", label: "Switching Ease", max: 20 },
  { key: "act_size_fit", category: "Activation", label: "Size Fit", max: 15 },
  { key: "act_immediate_value", category: "Activation", label: "Immediate Value", max: 20 },
  {
    key: "net_managed_creator_network",
    category: "Network",
    label: "Managed Creator Network",
    max: 35,
  },
  {
    key: "net_creator_facing_audience",
    category: "Network",
    label: "Creator-facing Audience",
    max: 25,
  },
  { key: "net_owned_community", category: "Network", label: "Owned Community", max: 25 },
  {
    key: "net_distribution_leverage",
    category: "Network",
    label: "Distribution Leverage",
    max: 15,
  },
] as const;

export type ScoreKey = (typeof SCORE_DEFINITIONS)[number]["key"];
export type ScoreCategory = (typeof SCORE_DEFINITIONS)[number]["category"];
export type ScoreInputs = Record<ScoreKey, number>;

export const CONTACT_CHANNELS = ["public_email", "contact_form", "social_dm", "agency_contact"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];
export const TEAM_SIZES = ["unknown", "solo", "small", "mature", "enterprise"] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];
export const CONTENT_FREQUENCIES = ["unknown", "low", "medium", "high"] as const;
export type ContentFrequency = (typeof CONTENT_FREQUENCIES)[number];

export const FACT_CSV_HEADERS = [
  "fact_owned_audience",
  "fact_active_platform_count",
  "fact_content_frequency",
  "fact_newsletter",
  "fact_community",
  "fact_paid_community",
  "fact_course",
  "fact_coaching",
  "fact_membership",
  "fact_ecommerce",
  "fact_affiliate",
  "fact_brand_deal",
  "fact_contact_channels",
  "fact_ai_usage",
  "fact_ai_native",
  "fact_virtual_creator",
  "fact_team_size",
  "fact_creator_educator",
  "fact_manages_creators",
  "fact_agency_or_studio",
  "fact_creator_audience",
  "fact_distribution_channel_count",
] as const;

export type CandidateFacts = {
  ownedAudience: boolean;
  activePlatformCount: number;
  contentFrequency: ContentFrequency;
  newsletter: boolean;
  community: boolean;
  paidCommunity: boolean;
  course: boolean;
  coaching: boolean;
  membership: boolean;
  ecommerce: boolean;
  affiliate: boolean;
  brandDeal: boolean;
  contactChannels: ContactChannel[];
  aiUsage: boolean;
  aiNative: boolean;
  virtualCreator: boolean;
  teamSize: TeamSize;
  creatorEducator: boolean;
  managesCreators: boolean;
  agencyOrStudio: boolean;
  creatorAudience: boolean;
  distributionChannelCount: number;
};

export const DEFAULT_FACTS: CandidateFacts = {
  ownedAudience: false,
  activePlatformCount: 0,
  contentFrequency: "unknown",
  newsletter: false,
  community: false,
  paidCommunity: false,
  course: false,
  coaching: false,
  membership: false,
  ecommerce: false,
  affiliate: false,
  brandDeal: false,
  contactChannels: [],
  aiUsage: false,
  aiNative: false,
  virtualCreator: false,
  teamSize: "unknown",
  creatorEducator: false,
  managesCreators: false,
  agencyOrStudio: false,
  creatorAudience: false,
  distributionChannelCount: 0,
};

export const candidateFactsSchema = z.object({
  ownedAudience: z.boolean(),
  activePlatformCount: z.number().int().min(0).max(10),
  contentFrequency: z.enum(CONTENT_FREQUENCIES),
  newsletter: z.boolean(),
  community: z.boolean(),
  paidCommunity: z.boolean(),
  course: z.boolean(),
  coaching: z.boolean(),
  membership: z.boolean(),
  ecommerce: z.boolean(),
  affiliate: z.boolean(),
  brandDeal: z.boolean(),
  contactChannels: z.array(z.enum(CONTACT_CHANNELS)).max(CONTACT_CHANNELS.length),
  aiUsage: z.boolean(),
  aiNative: z.boolean(),
  virtualCreator: z.boolean(),
  teamSize: z.enum(TEAM_SIZES),
  creatorEducator: z.boolean(),
  managesCreators: z.boolean(),
  agencyOrStudio: z.boolean(),
  creatorAudience: z.boolean(),
  distributionChannelCount: z.number().int().min(0).max(10),
});

export const SCORE_KEYS = SCORE_DEFINITIONS.map((definition) => definition.key) as ScoreKey[];

export function getScoreDefinition(key: string) {
  return SCORE_DEFINITIONS.find((definition) => definition.key === key);
}

export function priorityTier(priorityScore: number) {
  if (priorityScore >= 85) return "P0";
  if (priorityScore >= 75) return "P1";
  if (priorityScore >= 65) return "P2";
  return "P3";
}

export function calculateScores(inputs: ScoreInputs) {
  for (const definition of SCORE_DEFINITIONS) {
    const value = inputs[definition.key];
    if (!Number.isInteger(value) || value < 0 || value > definition.max) {
      throw new Error(`${definition.key} must be an integer between 0 and ${definition.max}`);
    }
  }

  const fit = SCORE_DEFINITIONS.filter((definition) => definition.category === "Fit").reduce(
    (total, definition) => total + inputs[definition.key],
    0,
  );
  const activation = SCORE_DEFINITIONS.filter(
    (definition) => definition.category === "Activation",
  ).reduce((total, definition) => total + inputs[definition.key], 0);
  const network = SCORE_DEFINITIONS.filter((definition) => definition.category === "Network").reduce(
    (total, definition) => total + inputs[definition.key],
    0,
  );
  const priorityScore = Math.round((fit * 0.5 + activation * 0.3 + network * 0.2) * 10) / 10;

  return {
    fit,
    activation,
    network,
    priorityScore,
    priority: priorityTier(priorityScore),
  };
}

export type ScoreSignal = {
  key: ScoreKey;
  category: ScoreCategory;
  label: string;
  score: number;
  max: number;
  reason: string;
};

export type FactScoreResult = {
  facts: CandidateFacts;
  inputs: ScoreInputs;
  scores: ReturnType<typeof calculateScores>;
  signals: ScoreSignal[];
};

function bucket(value: number, thresholds: Array<[number, number]>) {
  for (const [minimum, score] of thresholds) if (value >= minimum) return score;
  return 0;
}

function yes(value: boolean) {
  return value ? "yes" : "no";
}

export function scoreFacts(input: CandidateFacts): FactScoreResult {
  const facts = candidateFactsSchema.parse(input);
  const monetizationCount = [facts.course, facts.coaching, facts.membership, facts.ecommerce, facts.affiliate, facts.brandDeal].filter(Boolean).length;
  const fanChannels = [facts.newsletter, facts.community, facts.paidCommunity, facts.membership].filter(Boolean).length;
  const workflowSignals = [facts.ownedAudience, facts.newsletter, facts.community, facts.paidCommunity, facts.course, facts.coaching, facts.membership, facts.ecommerce, facts.affiliate, facts.brandDeal].filter(Boolean).length;
  const contactScore = facts.contactChannels.includes("public_email") ? 25 : facts.contactChannels.some((channel) => channel === "contact_form" || channel === "agency_contact") ? 20 : facts.contactChannels.includes("social_dm") ? 15 : 0;
  const scores: ScoreInputs = {
    fit_audience: facts.ownedAudience ? 20 : 0,
    fit_monetization: bucket(monetizationCount, [[3, 20], [2, 15], [1, 10]]),
    fit_multiplatform: bucket(facts.activePlatformCount, [[4, 15], [3, 12], [2, 9], [1, 5]]),
    fit_content_pressure: { unknown: 0, low: 5, medium: 10, high: 15 }[facts.contentFrequency],
    fit_fan_relationship: Math.min(15, (facts.newsletter ? 4 : 0) + (facts.community ? 5 : 0) + (facts.paidCommunity ? 6 : 0) + (facts.membership ? 5 : 0)),
    fit_ai_affinity: facts.aiNative ? 15 : facts.aiUsage && facts.virtualCreator ? 15 : facts.virtualCreator ? 12 : facts.aiUsage ? 10 : 0,
    act_reachability: contactScore,
    act_early_adopter: facts.aiNative ? 20 : facts.aiUsage ? 16 : facts.virtualCreator ? 15 : 0,
    act_switching_ease: { unknown: 0, solo: 20, small: 16, mature: 8, enterprise: 4 }[facts.teamSize],
    act_size_fit: { unknown: 0, solo: 12, small: 15, mature: 8, enterprise: 3 }[facts.teamSize],
    act_immediate_value: bucket(workflowSignals, [[3, 20], [2, 14], [1, 8]]),
    net_managed_creator_network: facts.managesCreators || facts.agencyOrStudio ? 35 : facts.creatorEducator ? 20 : 0,
    net_creator_facing_audience: facts.creatorAudience ? 25 : 0,
    net_owned_community: facts.paidCommunity || facts.membership ? 25 : facts.community ? 18 : facts.newsletter ? 8 : 0,
    net_distribution_leverage: bucket(facts.distributionChannelCount, [[4, 15], [3, 12], [2, 9], [1, 5]]),
  };
  const signals: ScoreSignal[] = SCORE_DEFINITIONS.map((definition) => ({
    key: definition.key,
    category: definition.category,
    label: definition.label,
    score: scores[definition.key],
    max: definition.max,
    reason: "Rule-based score from the recorded public facts.",
  }));
  const reasons: Partial<Record<ScoreKey, string>> = {
    fit_audience: `Owned audience: ${yes(facts.ownedAudience)} → ${scores.fit_audience}/20.`,
    fit_monetization: `${monetizationCount} owned monetization signal(s) → ${scores.fit_monetization}/20; 1=10, 2=15, 3+=20.`,
    fit_multiplatform: `${facts.activePlatformCount} active platform(s) → ${scores.fit_multiplatform}/15; 1=5, 2=9, 3=12, 4+=15.`,
    fit_content_pressure: `Content frequency is ${facts.contentFrequency} → ${scores.fit_content_pressure}/15.`,
    fit_fan_relationship: `${fanChannels} fan relationship channel(s) → ${scores.fit_fan_relationship}/15.`,
    fit_ai_affinity: `AI usage: ${yes(facts.aiUsage)}, AI-native: ${yes(facts.aiNative)}, virtual creator: ${yes(facts.virtualCreator)} → ${scores.fit_ai_affinity}/15.`,
    act_reachability: `${facts.contactChannels.length} public contact channel(s); the strongest verified path sets the score → ${scores.act_reachability}/25.`,
    act_early_adopter: `AI-native/AI/virtual signal → ${scores.act_early_adopter}/20.`,
    act_switching_ease: `Team size ${facts.teamSize} → ${scores.act_switching_ease}/20.`,
    act_size_fit: `Team size ${facts.teamSize}; small teams fit the beta best → ${scores.act_size_fit}/15.`,
    act_immediate_value: `${workflowSignals} active audience/workflow signal(s) → ${scores.act_immediate_value}/20.`,
    net_managed_creator_network: `Manages creators: ${yes(facts.managesCreators)}, agency/studio: ${yes(facts.agencyOrStudio)}, educator: ${yes(facts.creatorEducator)} → ${scores.net_managed_creator_network}/35.`,
    net_creator_facing_audience: `Creator-facing audience: ${yes(facts.creatorAudience)} → ${scores.net_creator_facing_audience}/25.`,
    net_owned_community: `Community ownership signals → ${scores.net_owned_community}/25; paid community or membership=25, community=18, newsletter=8.`,
    net_distribution_leverage: `${facts.distributionChannelCount} distribution channel(s) → ${scores.net_distribution_leverage}/15.`,
  };
  for (const signal of signals) signal.reason = reasons[signal.key] ?? signal.reason;
  return { facts, inputs: scores, scores: calculateScores(scores), signals };
}
