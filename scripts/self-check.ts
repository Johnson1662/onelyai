import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "onely-outreach-check-"));
const databasePath = path.join(tempDirectory, "check.sqlite");
process.env.ONELY_DB_PATH = databasePath;

async function main() {
  const { getSqlite } = await import("@/db/client");
  const {
    changeStatus,
    commitImport,
    createCandidate,
    getActivity,
    getCandidate,
    getDashboard,
    loadDemoFunnel,
    overrideScore,
    resetDemoFunnel,
  } = await import("@/lib/repository");
  const { buildManualRecord } = await import("@/lib/manual");

  try {
    const csv = fs.readFileSync(path.join(process.cwd(), "candidates", "onely_candidates_100_rescored_v2.csv"), "utf8");
    const report = commitImport(csv);
    assert.equal(report.imported, 100);
    assert.deepEqual(getDashboard("real").metrics, {
      total: 100,
      verified: 100,
      readyForOutreach: 0,
      contacted: 0,
      replied: 0,
      interested: 0,
      signedUp: 0,
      activated: 0,
    });
    assert.equal(getCandidate("021")?.candidate.priority, "P0");

    const before = getCandidate("001")?.candidate.priorityScore;
    overrideScore("001", "fit_audience", 10, "No owned community evidence");
    assert.notEqual(getCandidate("001")?.candidate.priorityScore, before);
    assert.ok(getActivity(20, "001").some((item) => item.action === "human_score_override"));
    assert.throws(() => changeStatus("001", "contacted"));
    changeStatus("001", "ready_for_outreach");

    const manual = buildManualRecord({
      candidateId: "facts-001",
      candidateOrigin: "self-check",
      name: "Facts Candidate",
      brandOrHandle: "@facts-candidate",
      segment: "Creator Entrepreneur",
      primaryPlatformOrAsset: "Newsletter",
      publicProfileUrl: "https://example.com/facts-candidate",
      contactType: "Public business email",
      contactSourceUrl: "https://example.com/contact",
      contactValuePublic: "facts@example.com",
      matchReason: "Structured public facts are scored locally.",
      ownedAudienceSignal: "Official newsletter page.",
      monetizationSignal: "Official membership page.",
      aiAffinity: "Public AI workflow.",
      networkValueSignal: "Creator audience is public.",
      verificationLevel: "A",
      verifiedAt: "2026-09-13",
      funnelStatus: "discovered",
      evidence: [{ url: "https://example.com/evidence", summary: "Public evidence supports the facts." }],
      facts: {
        ownedAudience: true,
        activePlatformCount: 3,
        contentFrequency: "high",
        newsletter: true,
        community: true,
        paidCommunity: false,
        course: true,
        coaching: false,
        membership: true,
        ecommerce: false,
        affiliate: false,
        brandDeal: false,
        contactChannels: ["public_email"],
        aiUsage: true,
        aiNative: false,
        virtualCreator: false,
        teamSize: "small",
        creatorEducator: true,
        managesCreators: false,
        agencyOrStudio: false,
        creatorAudience: true,
        distributionChannelCount: 3,
      },
    });
    const created = createCandidate(manual.record);
    assert.equal(created.candidate.facts?.ownedAudience, true);
    assert.equal(created.components.find((component) => component.scoreKey === "fit_audience")?.source, "FACT_RULES");
    const manualBefore = created.candidate.priorityScore;
    overrideScore("facts-001", "fit_audience", 0, "Review found no owned audience");
    assert.notEqual(getCandidate("facts-001")?.candidate.priorityScore, manualBefore);
    assert.equal(getCandidate("facts-001")?.candidate.facts?.ownedAudience, true);

    const realStatus = getCandidate("021")?.candidate.funnelStatus;
    const demo = loadDemoFunnel();
    assert.equal(demo.metrics.activated, 1);
    assert.equal(getCandidate("021")?.candidate.funnelStatus, realStatus);
    resetDemoFunnel();
    assert.equal(getDashboard("demo").loaded, false);
    console.log("Self-check passed: import, scoring, override, status guard, and demo isolation.");
  } finally {
    getSqlite().close();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

void main();
