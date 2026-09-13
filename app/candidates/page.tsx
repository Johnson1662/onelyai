"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, ErrorAlert, Loading, PageIntro, scoreTone, humanize } from "@/components/ui";
import { SEGMENT_GROUPS } from "@/lib/taxonomy";
import type { ImportCommitReport } from "@/lib/repository";
import type { ImportPreview } from "@/lib/import";
import type { CandidateRecord } from "@/lib/repository";

type ListResponse = { rows: CandidateRecord[]; total: number; page: number; pageSize: number };
type Filters = {
  search: string;
  segmentGroup: string;
  priority: string;
  verification: string;
  funnelStatus: string;
  aiAffinity: string;
  hasEmail: boolean;
  fitMin: string;
  fitMax: string;
  activationMin: string;
  activationMax: string;
  networkMin: string;
  networkMax: string;
};

const emptyFilters: Filters = { search: "", segmentGroup: "", priority: "", verification: "", funnelStatus: "", aiAffinity: "", hasEmail: false, fitMin: "", fitMax: "", activationMin: "", activationMax: "", networkMin: "", networkMax: "" };
const statuses = ["discovered", "qualified", "verified", "ready_for_outreach", "disqualified"];

function Score({ value }: { value: number }) {
  return <Badge tone={scoreTone(value)}>{value}</Badge>;
}

export default function CandidatesPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importReport, setImportReport] = useState<ImportCommitReport | null>(null);
  const [resolution, setResolution] = useState<"keep_existing" | "replace_existing">("keep_existing");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === "boolean") { if (value) params.set(key, "true"); }
      else if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters, page]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/candidates?${query}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load candidates");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load candidates");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void loadCandidates(); }, [loadCandidates]);

  function updateFilter(key: keyof Filters, value: string | boolean) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function changeStatus(candidateId: string, status: string) {
    setBusyId(candidateId);
    setError("");
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "status", status }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update status");
      await loadCandidates();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update status");
    } finally {
      setBusyId("");
    }
  }

  async function previewFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setImportReport(null);
    setError("");
    if (!nextFile) return;
    const form = new FormData();
    form.append("file", nextFile);
    try {
      const response = await fetch("/api/import/preview", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to preview CSV");
      setPreview(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to preview CSV");
    }
  }

  async function commitFile() {
    if (!file) return;
    setImporting(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("resolution", resolution);
    try {
      const response = await fetch("/api/import/commit", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to import CSV");
      setImportReport(body);
      await loadCandidates();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to import CSV");
    } finally {
      setImporting(false);
    }
  }

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;
  return (
    <div className="space-y-6">
      <PageIntro eyebrow="Candidate pipeline" title="Candidates" description="Sort the pool by explainable Priority, inspect public evidence, and move real candidates only through the pre-outreach workflow." action={<Link href="/candidates/new" className="button-secondary">Add candidate</Link>} />
      {error ? <ErrorAlert message={error} /> : null}

      <section className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Import</p><h3 className="mt-1 text-lg font-bold text-slate-900">Load a scored candidate CSV</h3><p className="mt-1 text-sm text-slate-500">The v2.0 file is recalculated from its 15 component scores before commit.</p></div><button type="button" className="button-secondary" onClick={() => fileRef.current?.click()}>Choose CSV</button><input ref={fileRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => void previewFile(event.target.files?.[0] ?? null)} /></div>
        {file ? <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-semibold text-slate-700">{file.name}</span>{preview ? <span className="text-slate-500">{preview.rowsRead} rows · {preview.validRows.length} valid · {preview.invalidRows.length} invalid · {preview.duplicates.length} duplicate matches</span> : <span className="text-slate-400">Previewing…</span>}</div>{preview?.parseError ? <p className="mt-2 text-rose-700">{preview.parseError}</p> : null}{preview && preview.mismatches.length ? <p className="mt-2 text-amber-700">{preview.mismatches.length} total score mismatches will be corrected from component inputs.</p> : null}{preview && preview.invalidRows.length ? <details className="mt-3"><summary className="cursor-pointer font-semibold text-rose-700">Show invalid rows</summary><div className="mt-2 space-y-1 text-xs text-rose-700">{preview.invalidRows.slice(0, 8).map((row) => <p key={row.rowNumber}>Row {row.rowNumber}: {row.errors.join("; ")}</p>)}</div></details> : null}{preview ? <div className="mt-4 flex flex-wrap items-center gap-3"><label className="text-xs font-semibold text-slate-600">Existing duplicates<select className="field mt-1 w-auto min-w-44" value={resolution} onChange={(event) => setResolution(event.target.value as typeof resolution)}><option value="keep_existing">Keep existing</option><option value="replace_existing">Replace existing</option></select></label><button type="button" className="button-primary" disabled={importing || !preview.validRows.length} onClick={() => void commitFile()}>{importing ? "Importing…" : "Import valid rows"}</button></div> : null}</div> : null}
        {importReport ? <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">Imported {importReport.imported}; skipped {importReport.skipped}; duplicates {importReport.duplicated}; invalid {importReport.invalid}.</div> : null}
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="flex-1"><label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search name, handle, or public contact</label><input className="field mt-1" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Try Jay Clouse or @handle" /></div><div className="flex flex-wrap gap-2"><label className="text-xs font-semibold text-slate-500">Segment<select className="field mt-1 min-w-48" value={filters.segmentGroup} onChange={(event) => updateFilter("segmentGroup", event.target.value)}><option value="">All segments</option>{SEGMENT_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Priority<select className="field mt-1 w-28" value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)}><option value="">All</option>{["P0", "P1", "P2", "P3"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Verification<select className="field mt-1 w-28" value={filters.verification} onChange={(event) => updateFilter("verification", event.target.value)}><option value="">All</option>{["A", "B", "C"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">AI affinity<select className="field mt-1 w-36" value={filters.aiAffinity} onChange={(event) => updateFilter("aiAffinity", event.target.value)}><option value="">All</option>{["Very High", "High", "Medium-High", "Medium", "Low"].map((value) => <option key={value}>{value}</option>)}</select></label></div></div>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={filters.hasEmail} onChange={(event) => updateFilter("hasEmail", event.target.checked)} /> Has public email</label><div className="flex flex-wrap gap-2 text-xs text-slate-500"><label>Fit min<input className="field mt-1 w-20" type="number" min="0" max="100" value={filters.fitMin} onChange={(event) => updateFilter("fitMin", event.target.value)} /></label><label>Fit max<input className="field mt-1 w-20" type="number" min="0" max="100" value={filters.fitMax} onChange={(event) => updateFilter("fitMax", event.target.value)} /></label><label>Act min<input className="field mt-1 w-20" type="number" min="0" max="100" value={filters.activationMin} onChange={(event) => updateFilter("activationMin", event.target.value)} /></label><label>Act max<input className="field mt-1 w-20" type="number" min="0" max="100" value={filters.activationMax} onChange={(event) => updateFilter("activationMax", event.target.value)} /></label><label>Net min<input className="field mt-1 w-20" type="number" min="0" max="100" value={filters.networkMin} onChange={(event) => updateFilter("networkMin", event.target.value)} /></label><label>Net max<input className="field mt-1 w-20" type="number" min="0" max="100" value={filters.networkMax} onChange={(event) => updateFilter("networkMax", event.target.value)} /></label></div><button type="button" className="button-secondary ml-auto" onClick={() => { setFilters(emptyFilters); setPage(1); }}>Reset filters</button></div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="eyebrow">Priority queue</p><h3 className="mt-1 text-lg font-bold text-slate-900">{data?.total ?? 0} candidates</h3></div><span className="text-xs text-slate-400">Default: Priority ↓</span></div>
        {loading ? <Loading label="Loading candidates" /> : data?.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Creator</th><th className="px-4 py-3">Segment</th><th className="px-4 py-3">Fit</th><th className="px-4 py-3">Activation</th><th className="px-4 py-3">Network</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Verify</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Contact</th></tr></thead><tbody className="divide-y divide-slate-100">{data.rows.map((candidate) => <tr key={candidate.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/candidates/${candidate.candidateId}`} className="font-semibold text-slate-800 hover:text-teal">{candidate.name}</Link><p className="mt-1 max-w-60 truncate text-xs text-slate-400">{candidate.brandOrHandle}</p></td><td className="max-w-48 px-4 py-4"><p className="truncate text-slate-600" title={candidate.segment}>{candidate.segmentGroup}</p><p className="mt-1 truncate text-xs text-slate-400" title={candidate.segment}>{candidate.segment}</p></td><td className="px-4 py-4"><Score value={candidate.fitScore} /></td><td className="px-4 py-4"><Score value={candidate.activationScore} /></td><td className="px-4 py-4"><Score value={candidate.networkScore} /></td><td className="px-4 py-4"><div className="flex items-center gap-2"><Badge tone={candidate.priority === "P0" ? "teal" : candidate.priority === "P1" ? "blue" : candidate.priority === "P2" ? "amber" : "slate"}>{candidate.priority}</Badge><span className="font-semibold text-slate-700">{candidate.priorityScore}</span></div></td><td className="px-4 py-4"><Badge tone={candidate.verificationLevel === "A" ? "teal" : "amber"}>{candidate.verificationLevel}</Badge></td><td className="px-4 py-4"><select aria-label={`Change status for ${candidate.name}`} className="field w-44" value={candidate.funnelStatus} disabled={busyId === candidate.candidateId} onChange={(event) => void changeStatus(candidate.candidateId, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></td><td className="px-4 py-4 text-xs text-slate-500">{candidate.contactValuePublic.includes("@") ? <Badge tone="teal">Public email</Badge> : candidate.contactType}</td></tr>)}</tbody></table></div> : <div className="p-6"><p className="text-center text-sm text-slate-500">No candidates match the current filters.</p></div>}
        {data ? <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500"><span>Page {data.page} of {totalPages}</span><div className="flex gap-2"><button type="button" className="button-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" className="button-secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div> : null}
      </section>
    </div>
  );
}
