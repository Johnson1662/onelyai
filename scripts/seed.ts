import fs from "node:fs";
import path from "node:path";
import { commitImport } from "@/lib/repository";
import { getDatabasePath, getSqlite } from "@/db/client";

const source = path.join(process.cwd(), "candidates", "onely_candidates_100_rescored_v2.csv");
const text = fs.readFileSync(source, "utf8");
const report = commitImport(text, "keep_existing");
console.log(JSON.stringify({ source, database: getDatabasePath(), ...report }, null, 2));
getSqlite().close();
