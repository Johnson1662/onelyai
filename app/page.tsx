"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, EmptyState, ErrorAlert, Loading, PageIntro, formatDate, humanize } from "@/components/ui";
import type { DashboardData } from "@/lib/repository";

const metricLabels: Array<[keyof DashboardData["metrics"], string]> = [
  ["total", "Total candidates"],
  ["verified", "Verified"],
  ["readyForOutreach", "Ready for outreach"],
  ["contacted", "Contacted"],
  ["replied", "Replied"],
  ["interested", "Interested"],
  ["signedUp", "Signed up"],
  ["activated", "Activated"],
];

function StageBar({ count, total }: { count: number; total: number }) {
  const width = total ? Math.max((count / total) * 100, count ? 2 : 0) : 0;
  return <div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${width}%` }} /></div>;
}

export default function DashboardPage() {
  const [mode, setMode] = useState<"real" | "demo">("real");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (nextMode = mode) => {
    setError("");
    try {
      const response = await fetch(`/api/dashboard?mode=${nextMode}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load dashboard");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard");
    }
  }, [mode]);

  useEffect(() => { void load(); }, [load]);

  async function demoAction(action: "load" | "reset") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/demo-funnel/${action}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update demo funnel");
      setMode("demo");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update demo funnel");
    } finally {
      setBusy(false);
    }
  }

  const total = data?.metrics.total ?? 0;
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Acquisition dashboard"
        title="Creator pipeline"
        description="Prioritize creators with public evidence, then track the path from verified candidate to activation."
        action={<Link href="/candidates" className="button-primary">Open candidates</Link>}
      />

      {error ? <ErrorAlert message={error} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
        <div className="flex items-center gap-2 text-sm text-slate-600"><span className="font-semibold text-slate-900">Data view</span><Badge tone={mode === "demo" ? "amber" : "teal"}>{mode === "demo" ? "Simulated" : "Real candidate data"}</Badge></div>
        <div className="flex gap-2">
          <button type="button" className={mode === "real" ? "button-primary" : "button-secondary"} onClick={() => setMode("real")}>Real data</button>
          <button type="button" className={mode === "demo" ? "button-primary" : "button-secondary"} onClick={() => setMode("demo")}>Demo funnel</button>
          {mode === "demo" ? <><button type="button" className="button-secondary" disabled={busy || !data?.loaded} onClick={() => void demoAction("load")}>Reload demo</button><button type="button" className="button-danger" disabled={busy || !data?.loaded} onClick={() => void demoAction("reset")}>Clear demo</button></> : null}
        </div>
      </div>

      {mode === "demo" ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><strong>Demo funnel data.</strong> Synthetic statuses are stored separately; no creator outreach was performed.</div> : null}
      {mode === "demo" && !data?.loaded ? <div className="panel px-5 py-8"><EmptyState title="Demo funnel is empty" description="Load the deterministic simulated funnel to demonstrate post-contact stages without changing real candidates." /><div className="mt-4 text-center"><button type="button" className="button-primary" disabled={busy} onClick={() => void demoAction("load")}>Load demo funnel</button></div></div> : null}

      {!data ? <Loading label="Loading dashboard" /> : <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricLabels.map(([key, label]) => <div key={key} className="panel p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{data.metrics[key]}</p></div>)}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="panel p-5">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Funnel health</p><h3 className="mt-1 text-lg font-bold text-slate-900">Stage conversion</h3></div><p className="text-xs text-slate-400">Count / prior stage</p></div>
            <div className="mt-6 space-y-4">
              {data.funnel.map((item) => <div key={item.stage} className="grid grid-cols-[125px_1fr_68px] items-center gap-3 text-sm"><span className="font-medium text-slate-600">{humanize(item.stage)}</span><StageBar count={item.count} total={total} /><span className="text-right font-semibold text-slate-800">{item.count} <span className="text-xs font-normal text-slate-400">{item.conversion === null ? "—" : `${item.conversion}%`}</span></span></div>)}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-400">Rates are cumulative funnel stage counts. A candidate at a later stage is included in each earlier stage.</p>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Priority mix</p><h3 className="mt-1 text-lg font-bold text-slate-900">Ranking distribution</h3>
            <div className="mt-6 space-y-4">{data.priorityBreakdown.map((item) => <div key={item.name} className="flex items-center gap-3"><Badge tone={item.name === "P0" ? "teal" : item.name === "P1" ? "blue" : item.name === "P2" ? "amber" : "slate"}>{item.name}</Badge><StageBar count={item.count} total={total} /><span className="w-8 text-right text-sm font-semibold text-slate-700">{item.count}</span></div>)}</div>
            <Link href="/candidates" className="mt-6 inline-block text-sm font-semibold text-teal hover:underline">Review ranked queue →</Link>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="panel overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><p className="eyebrow">Segments</p><h3 className="mt-1 text-lg font-bold text-slate-900">Where the pool comes from</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Group</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Verified</th><th className="px-5 py-3">Activated</th></tr></thead><tbody className="divide-y divide-slate-100">{data.segmentBreakdown.map((item) => <tr key={item.name}><td className="px-5 py-3 font-medium text-slate-700">{item.name}</td><td className="px-5 py-3 text-slate-500">{item.total}</td><td className="px-5 py-3 text-slate-500">{item.verified}</td><td className="px-5 py-3 font-semibold text-slate-700">{item.activated}</td></tr>)}</tbody></table></div></section>
          <section className="panel overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><p className="eyebrow">Origin / source</p><h3 className="mt-1 text-lg font-bold text-slate-900">Discovery provenance</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Origin</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Verified</th><th className="px-5 py-3">Activated</th></tr></thead><tbody className="divide-y divide-slate-100">{data.sourceBreakdown.map((item) => <tr key={item.name}><td className="px-5 py-3 font-medium text-slate-700">{item.name}</td><td className="px-5 py-3 text-slate-500">{item.total}</td><td className="px-5 py-3 text-slate-500">{item.verified}</td><td className="px-5 py-3 font-semibold text-slate-700">{item.activated}</td></tr>)}</tbody></table></div></section>
        </div>

        <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="eyebrow">Audit</p><h3 className="mt-1 text-lg font-bold text-slate-900">Recent activity</h3></div><Link href="/activity" className="text-sm font-semibold text-teal hover:underline">View all →</Link></div>{data.recentActivity.length ? <div className="divide-y divide-slate-100">{data.recentActivity.map((item) => <div key={item.id} className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-slate-700"><span className="font-semibold">{humanize(item.action)}</span>{item.candidateName ? <> · {item.candidateName}</> : null}{item.reason ? <span className="text-slate-400"> · {item.reason}</span> : null}</p><time className="text-xs text-slate-400">{formatDate(item.createdAt)}</time></div>)}</div> : <div className="px-5 py-8"><EmptyState title="No activity yet" description="Import or update a candidate to create an audit entry." /></div>}</section>
      </>}
    </div>
  );
}
