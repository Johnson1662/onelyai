"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, EmptyState, ErrorAlert, Loading, PageIntro, formatDate, humanize } from "@/components/ui";
import type { DiscoveryRecord } from "@/lib/repository";

export default function DiscoveryPage() {
  const [items, setItems] = useState<DiscoveryRecord[]>([]);
  const [form, setForm] = useState({ url: "", source: "", query: "", notes: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/discovery", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load discovery queue");
      setItems(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load discovery queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to add discovery item");
      setForm({ url: "", source: "", query: "", notes: "" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add discovery item");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, status: "reviewing" | "qualified" | "rejected") {
    try {
      const response = await fetch(`/api/discovery/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update discovery item");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update discovery item");
    }
  }

  return <div className="app-page space-y-6"><PageIntro eyebrow="Expansion queue" title="Discovery" description="Capture public creator URLs and move them into the scored candidate workflow after human review." action={<Link href="/candidates" className="button-secondary">View candidates</Link>} />{error ? <ErrorAlert message={error} /> : null}<section className="panel p-5"><p className="eyebrow">Add public URL</p><form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={addItem}><label className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:col-span-2">URL *<input className="field mt-1" required type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://…" /></label><label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source *<input className="field mt-1" required value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} placeholder="Newsletter, Agency, Search…" /></label><label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Query<input className="field mt-1" value={form.query} onChange={(event) => setForm({ ...form, query: event.target.value })} placeholder="creator coach newsletter" /></label><label className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:col-span-2">Notes<textarea className="field mt-1 min-h-20" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="sm:col-span-2"><button type="submit" className="button-primary" disabled={saving}>{saving ? "Saving…" : "Add to queue"}</button></div></form></section><section className="panel overflow-hidden"><div className="panel-heading"><p className="eyebrow">Queue</p><h3 className="panel-title">{items.length} discovered URLs</h3></div>{loading ? <Loading label="Loading discovery queue" /> : items.length ? <div className="divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><a href={item.url} target="_blank" rel="noreferrer" className="evidence-link break-all text-sm">{item.url} ↗</a><div className="mt-2 flex flex-wrap gap-2"><Badge>{item.source}</Badge><Badge tone={item.status === "qualified" ? "teal" : item.status === "rejected" ? "rose" : "slate"}>{humanize(item.status)}</Badge><span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span></div>{item.query ? <p className="mt-2 text-xs text-slate-500">Query: {item.query}</p> : null}{item.notes ? <p className="mt-1 text-sm text-slate-600">{item.notes}</p> : null}</div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" className="button-secondary" onClick={() => void updateStatus(item.id, "reviewing")}>Review</button><button type="button" className="button-secondary" onClick={() => void updateStatus(item.id, "rejected")}>Reject</button>{item.status !== "rejected" ? <Link className="button-primary" href={`/candidates/new?discoveryId=${item.id}`}>Promote</Link> : null}</div></div>)}</div> : <div className="p-6"><EmptyState title="Discovery queue is empty" description="Add a public URL to start the next candidate expansion batch." /></div>}</section></div>;
}
