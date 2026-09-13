import { describe, expect, it } from "vitest";
import { calculateScores, SCORE_DEFINITIONS, type ScoreInputs } from "@/lib/scoring";

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
});
