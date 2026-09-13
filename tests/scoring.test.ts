import { describe, expect, it } from "vitest";
import { calculateScores, DEFAULT_FACTS, scoreFacts, SCORE_DEFINITIONS, type CandidateFacts, type ScoreInputs } from "@/lib/scoring";

function inputs(value: number): ScoreInputs {
  return Object.fromEntries(SCORE_DEFINITIONS.map((definition) => [definition.key, Math.min(value, definition.max)])) as ScoreInputs;
}

describe("scoring", () => {
  it("recalculates the documented top candidate", () => {
    const result = calculateScores({
      fit_audience: 20,
      fit_monetization: 20,
      fit_multiplatform: 15,
      fit_content_pressure: 15,
      fit_fan_relationship: 15,
      fit_ai_affinity: 10,
      act_reachability: 10,
      act_early_adopter: 15,
      act_switching_ease: 15,
      act_size_fit: 10,
      act_immediate_value: 20,
      net_managed_creator_network: 20,
      net_creator_facing_audience: 25,
      net_owned_community: 25,
      net_distribution_leverage: 15,
    });
    expect(result).toEqual({ fit: 95, activation: 70, network: 85, priorityScore: 85.5, priority: "P0" });
  });

  it("handles tier boundaries and rejects values outside a component max", () => {
    expect(calculateScores(inputs(0)).priority).toBe("P3");
    const threshold = inputs(0);
    threshold.fit_audience = 20;
    threshold.fit_monetization = 20;
    threshold.fit_multiplatform = 15;
    threshold.fit_content_pressure = 15;
    threshold.fit_fan_relationship = 15;
    threshold.fit_ai_affinity = 15;
    threshold.act_reachability = 25;
    threshold.act_early_adopter = 20;
    threshold.act_switching_ease = 20;
    threshold.act_size_fit = 15;
    threshold.act_immediate_value = 20;
    threshold.net_managed_creator_network = 0;
    threshold.net_creator_facing_audience = 25;
    threshold.net_owned_community = 0;
    threshold.net_distribution_leverage = 0;
    expect(calculateScores(threshold).priorityScore).toBe(85);
    expect(calculateScores(threshold).priority).toBe("P0");
    expect(() => calculateScores({ ...inputs(0), fit_audience: 21 })).toThrow();
  });

  it.each([
    {
      name: "creator entrepreneur",
      facts: {
        ...DEFAULT_FACTS,
        ownedAudience: true,
        activePlatformCount: 4,
        contentFrequency: "high",
        newsletter: true,
        community: true,
        paidCommunity: true,
        course: true,
        coaching: true,
        membership: true,
        ecommerce: true,
        affiliate: true,
        brandDeal: true,
        contactChannels: ["public_email"],
        aiUsage: true,
        teamSize: "small",
        creatorEducator: true,
        creatorAudience: true,
        distributionChannelCount: 4,
      },
      scores: { fit: 95, activation: 92, network: 85, priorityScore: 92.1, priority: "P0" },
    },
    {
      name: "AI-native creator",
      facts: {
        ...DEFAULT_FACTS,
        ownedAudience: true,
        activePlatformCount: 3,
        contentFrequency: "high",
        ecommerce: true,
        aiUsage: true,
        aiNative: true,
        virtualCreator: true,
        contactChannels: ["public_email"],
        teamSize: "solo",
        distributionChannelCount: 2,
      },
      scores: { fit: 72, activation: 91, network: 9, priorityScore: 65.1, priority: "P2" },
    },
    {
      name: "creator educator and agency",
      facts: {
        ...DEFAULT_FACTS,
        ownedAudience: true,
        activePlatformCount: 2,
        contentFrequency: "medium",
        newsletter: true,
        community: true,
        paidCommunity: true,
        course: true,
        coaching: true,
        contactChannels: ["agency_contact"],
        teamSize: "mature",
        creatorEducator: true,
        managesCreators: true,
        agencyOrStudio: true,
        creatorAudience: true,
        distributionChannelCount: 4,
      },
      scores: { fit: 69, activation: 56, network: 100, priorityScore: 71.3, priority: "P2" },
    },
    {
      name: "large mature creator",
      facts: {
        ...DEFAULT_FACTS,
        ownedAudience: true,
        activePlatformCount: 4,
        contentFrequency: "high",
        newsletter: true,
        community: true,
        membership: true,
        ecommerce: true,
        brandDeal: true,
        contactChannels: ["public_email"],
        teamSize: "mature",
        creatorAudience: true,
        distributionChannelCount: 4,
      },
      scores: { fit: 84, activation: 61, network: 65, priorityScore: 73.3, priority: "P2" },
    },
    {
      name: "commercial lifestyle creator",
      facts: {
        ...DEFAULT_FACTS,
        ownedAudience: true,
        activePlatformCount: 3,
        contentFrequency: "high",
        newsletter: true,
        community: true,
        membership: true,
        ecommerce: true,
        affiliate: true,
        brandDeal: true,
        contactChannels: ["contact_form"],
        teamSize: "small",
        distributionChannelCount: 3,
      },
      scores: { fit: 81, activation: 71, network: 37, priorityScore: 69.2, priority: "P2" },
    },
    {
      name: "tech SaaS UGC creator",
      facts: {
        ...DEFAULT_FACTS,
        activePlatformCount: 2,
        contentFrequency: "high",
        brandDeal: true,
        contactChannels: ["public_email"],
        aiUsage: true,
        teamSize: "solo",
        distributionChannelCount: 1,
      },
      scores: { fit: 44, activation: 81, network: 5, priorityScore: 47.3, priority: "P3" },
    },
  ])("scores the $name persona with deterministic local rules", ({ facts, scores }) => {
    const result = scoreFacts(facts as CandidateFacts);
    expect(result.scores).toEqual(scores);
    expect(result.signals).toHaveLength(15);
    expect(result.signals.every((signal) => signal.reason.length > 0)).toBe(true);
  });
});
