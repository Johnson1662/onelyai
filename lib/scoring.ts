export const SCORE_VERSION = "v2.0-evidence-rubric-50-30-20";

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
