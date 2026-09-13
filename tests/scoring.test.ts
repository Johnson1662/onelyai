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
      scores: { fit: 95, activation: 87, network: 85, priorityScore: 90.6, priority: "P0" },
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
      scores: { fit: 70, activation: 87, network: 9, priorityScore: 62.9, priority: "P3" },
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
      scores: { fit: 75, activation: 51, network: 100, priorityScore: 72.8, priority: "P2" },
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
      scores: { fit: 84, activation: 56, network: 65, priorityScore: 71.8, priority: "P2" },
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
      scores: { fit: 84, activation: 66, network: 37, priorityScore: 69.2, priority: "P2" },
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
      scores: { fit: 40, activation: 78, network: 5, priorityScore: 44.4, priority: "P3" },
    },
  ])("scores the $name persona with deterministic local rules", ({ facts, scores }) => {
    const result = scoreFacts(facts as CandidateFacts);
    expect(result.scores).toEqual(scores);
    expect(result.signals).toHaveLength(15);
    expect(result.signals.every((signal) => signal.reason.length > 0)).toBe(true);
  });

  it("uses the README definitions for the targeted fact rules", () => {
    expect(scoreFacts({ ...DEFAULT_FACTS, ownedAudience: true }).inputs.fit_audience).toBe(10);
    expect(scoreFacts({ ...DEFAULT_FACTS, ownedAudience: true, newsletter: true }).inputs.fit_audience).toBe(20);

    expect(scoreFacts({ ...DEFAULT_FACTS, brandDeal: true }).inputs.fit_monetization).toBe(5);
    expect(scoreFacts({ ...DEFAULT_FACTS, affiliate: true, brandDeal: true }).inputs.fit_monetization).toBe(10);
    expect(scoreFacts({ ...DEFAULT_FACTS, course: true }).inputs.fit_monetization).toBe(15);
    expect(scoreFacts({ ...DEFAULT_FACTS, course: true, coaching: true }).inputs.fit_monetization).toBe(20);
    expect(scoreFacts({ ...DEFAULT_FACTS, course: true, coaching: true, ecommerce: true }).inputs.fit_monetization).toBe(20);

    expect(scoreFacts({ ...DEFAULT_FACTS, activePlatformCount: 1, contentFrequency: "high" }).inputs.fit_multiplatform).toBe(5);
    expect(scoreFacts({ ...DEFAULT_FACTS, activePlatformCount: 1, contentFrequency: "unknown" }).inputs.fit_multiplatform).toBe(5);
    expect(scoreFacts({ ...DEFAULT_FACTS, activePlatformCount: 2, contentFrequency: "unknown" }).inputs.fit_multiplatform).toBe(10);
    expect(scoreFacts({ ...DEFAULT_FACTS, activePlatformCount: 3, contentFrequency: "low" }).inputs.fit_multiplatform).toBe(15);

    expect(scoreFacts({ ...DEFAULT_FACTS }).inputs.act_reachability).toBe(0);
    expect(scoreFacts({ ...DEFAULT_FACTS, contactChannels: ["social_dm"] }).inputs.act_reachability).toBe(10);
    expect(scoreFacts({ ...DEFAULT_FACTS, contactChannels: ["contact_form"] }).inputs.act_reachability).toBe(15);
    expect(scoreFacts({ ...DEFAULT_FACTS, contactChannels: ["public_email"] }).inputs.act_reachability).toBe(20);
    expect(scoreFacts({ ...DEFAULT_FACTS, contactChannels: ["public_email", "contact_form"] }).inputs.act_reachability).toBe(25);

    const contentOnly = { ...DEFAULT_FACTS, activePlatformCount: 1, contentFrequency: "low" as const };
    expect(scoreFacts(contentOnly).inputs.act_immediate_value).toBe(0);
    expect(scoreFacts({ ...contentOnly, ownedAudience: true }).inputs.act_immediate_value).toBe(10);
    expect(scoreFacts({ ...contentOnly, ownedAudience: true, newsletter: true }).inputs.act_immediate_value).toBe(15);
    expect(scoreFacts({ ...contentOnly, ownedAudience: true, newsletter: true, course: true }).inputs.act_immediate_value).toBe(20);

    const explained = scoreFacts({ ...DEFAULT_FACTS, contactChannels: ["contact_form"], course: true, activePlatformCount: 2, contentFrequency: "low" });
    expect(explained.signals.find((signal) => signal.key === "fit_monetization")?.reason).toContain("1 owned=15");
    expect(explained.signals.find((signal) => signal.key === "act_reachability")?.reason).toContain("email + another path=25");
    expect(explained.signals.find((signal) => signal.key === "act_immediate_value")?.reason).toContain("content");
  });
});
