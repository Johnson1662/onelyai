import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildImportPreview, parseImportText } from "@/lib/import";

const csv = fs.readFileSync(path.join(process.cwd(), "candidates", "onely_candidates_100_rescored_v2.csv"), "utf8");

describe("candidate CSV import", () => {
  it("accepts the BOM encoded 100-row v2 dataset and recalculates every total", () => {
    const preview = buildImportPreview(csv, []);
    expect(preview.rowsRead).toBe(100);
    expect(preview.validRows).toHaveLength(100);
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.duplicates).toHaveLength(0);
    expect(preview.mismatches).toHaveLength(0);
    expect(preview.validRows[0].record.candidateId).toBe("001");
  });

  it("reports missing score fields and malformed row data", () => {
    const firstLine = csv.split("\n")[0];
    const malformed = `${firstLine}\n001,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`;
    const parsed = parseImportText(malformed);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.invalidRows[0].errors.length).toBeGreaterThan(0);
  });
});
