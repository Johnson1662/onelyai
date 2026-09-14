"use client";

import { useEffect, useState } from "react";
import { Badge, EmptyState, ErrorAlert, Loading, PageIntro, formatDate, humanize } from "@/components/ui";
import type { ActivityRecord } from "@/lib/repository";

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void fetch("/api/activity?limit=500", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load activity");
      setItems(body);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load activity")).finally(() => setLoading(false));
  }, []);

  return <div className="app-page space-y-6"><PageIntro eyebrow="Decision history" title="Activity" description="Every import, human score correction, status transition, and simulated funnel operation is recorded here." />{error ? <ErrorAlert message={error} /> : null}<section className="panel table-shell overflow-hidden">{loading ? <Loading label="Loading activity" /> : items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr><th className="px-5 py-3">Time</th><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Actor</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.id}><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">{formatDate(item.createdAt)}</td><td className="px-4 py-4 font-medium text-slate-700">{item.candidateName ?? "System"}{item.candidateId ? <span className="ml-2 text-xs text-slate-400">#{item.candidateId}</span> : null}</td><td className="px-4 py-4"><div className="flex gap-2"><Badge tone={item.isDemo ? "amber" : "slate"}>{humanize(item.action)}</Badge>{item.isDemo ? <Badge tone="amber">Demo</Badge> : null}</div></td><td className="px-4 py-4 text-xs text-slate-500">{item.field ? `${humanize(item.field)}: ` : ""}{item.previousValue ?? "—"} → {item.newValue ?? "—"}</td><td className="max-w-96 px-4 py-4 text-xs leading-5 text-slate-500">{item.reason ?? "—"}</td><td className="px-4 py-4 text-xs text-slate-500">{item.actor}</td></tr>)}</tbody></table></div> : <div className="p-6"><EmptyState title="No activity yet" description="Import a candidate or make a review decision to create the first audit entry." /></div>}</section></div>;
}
