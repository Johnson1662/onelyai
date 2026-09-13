"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, ErrorAlert, Loading, PageIntro, formatDate, humanize } from "@/components/ui";
import { getScoreDefinition, SCORE_DEFINITIONS } from "@/lib/scoring";
import { REAL_STATUS_OPTIONS } from "@/lib/status";
import type { CandidateDetail } from "@/lib/repository";

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const candidateId = params.id;
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(SCORE_DEFINITIONS[0].key);
  const [newScore, setNewScore] = useState(0);
  const [reason, setReason] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load candidate");
      setData(body);
      const current = body.components?.find((component: { scoreKey: string }) => component.scoreKey === selectedKey);
      if (current) setNewScore(current.score);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load candidate");
    } finally {
      setLoading(false);
    }
  }, [candidateId, selectedKey]);

  useEffect(() => { if (candidateId) void load(); }, [candidateId, load]);

  const selectedComponent = useMemo(() => data?.components.find((component) => component.scoreKey === selectedKey), [data, selectedKey]);
  function selectScore(key: string) {
    setSelectedKey(key as typeof selectedKey);
    const component = data?.components.find((item) => item.scoreKey === key);
    if (component) setNewScore(component.score);
    setReason("");
  }

  async function mutate(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update candidate");
      setData(result);
      if (body.type === "score_override") { setReason(""); setNewScore(result.components.find((component: { scoreKey: string }) => component.scoreKey === selectedKey)?.score ?? newScore); }
      if (body.type === "status") setStatusReason("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update candidate");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label="Loading candidate" />;
  if (!data) return <div className="space-y-4"><PageIntro title="Candidate unavailable" /><ErrorAlert message={error || "Candidate not found"} /><Link className="button-secondary" href="/candidates">Back to candidates</Link></div>;
  const { candidate, components, evidence, activity } = data;
  const selectedDefinition = getScoreDefinition(selectedKey);

  return (
    <div className="space-y-6">
      <PageIntro eyebrow="Candidate detail" title={candidate.name} description={`${candidate.brandOrHandle} · ${candidate.segment}`} action={<Link href="/candidates" className="button-secondary">← Back to candidates</Link>} />
      {error ? <ErrorAlert message={error} /> : null}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="panel p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Overview</p><h3 className="mt-1 text-lg font-bold text-slate-900">{candidate.name}</h3><p className="mt-1 text-sm text-slate-500">{candidate.primaryPlatformOrAsset}</p></div><div className="flex gap-2"><Badge tone={candidate.priority === "P0" ? "teal" : candidate.priority === "P1" ? "blue" : candidate.priority === "P2" ? "amber" : "slate"}>{candidate.priority} · {candidate.priorityScore}</Badge><Badge tone={candidate.verificationLevel === "A" ? "teal" : "amber"}>{candidate.verificationLevel} verified</Badge></div></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Segment</dt><dd className="mt-1 text-slate-700">{candidate.segmentGroup}<span className="mt-1 block text-xs text-slate-400">{candidate.segment}</span></dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Funnel status</dt><dd className="mt-1 font-semibold text-slate-700">{humanize(candidate.funnelStatus)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Public profile</dt><dd className="mt-1 truncate text-teal"><a href={candidate.publicProfileUrl} target="_blank" rel="noreferrer">{candidate.publicProfileUrl}</a></dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact path</dt><dd className="mt-1 text-slate-700">{candidate.contactType}<span className="mt-1 block break-words text-xs text-slate-500">{candidate.contactValuePublic}</span></dd></div></dl>{candidate.riskOrCaveat ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"><strong>Review caveat:</strong> {candidate.riskOrCaveat}</div> : null}</section>
          <section className="panel p-5"><p className="eyebrow">Match reason</p><p className="mt-3 text-sm leading-7 text-slate-700">{candidate.matchReason}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Owned audience</p><p className="mt-1 text-sm font-semibold text-slate-700">{candidate.ownedAudienceSignal}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Monetization</p><p className="mt-1 text-sm font-semibold text-slate-700">{candidate.monetizationSignal}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI affinity</p><p className="mt-1 text-sm font-semibold text-slate-700">{candidate.aiAffinity}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Network value</p><p className="mt-1 text-sm font-semibold text-slate-700">{candidate.networkValueSignal}</p></div></div></section>
          <section className="panel p-5"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Public evidence</p><h3 className="mt-1 text-lg font-bold text-slate-900">Evidence chain</h3></div><Badge tone="amber">Candidate-level evidence</Badge></div><p className="mt-3 text-sm leading-6 text-slate-500">The source CSV provides up to two public evidence entries per candidate. They support the profile as a whole; this MVP does not invent a 15-item evidence mapping.</p><div className="mt-5 space-y-3">{evidence.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50/30"><p className="text-xs font-semibold text-teal">Source {item.position} ↗</p><p className="mt-1 break-all text-xs text-slate-400">{item.url}</p><p className="mt-2 text-sm leading-6 text-slate-700">{item.summary}</p></a>)}</div></section>
        </div>
        <div className="space-y-6">
          <section className="panel p-5"><p className="eyebrow">Score breakdown</p><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-400">Fit</p><p className="mt-1 text-2xl font-bold text-slate-900">{candidate.fitScore}</p></div><div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-400">Activation</p><p className="mt-1 text-2xl font-bold text-slate-900">{candidate.activationScore}</p></div><div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-400">Network</p><p className="mt-1 text-2xl font-bold text-slate-900">{candidate.networkScore}</p></div></div><div className="mt-5 space-y-2">{components.map((component) => { const definition = getScoreDefinition(component.scoreKey); return <button type="button" key={component.scoreKey} onClick={() => selectScore(component.scoreKey)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${selectedKey === component.scoreKey ? "border-teal-300 bg-teal-50" : "border-slate-100 hover:bg-slate-50"}`}><span><span className="block text-sm font-medium text-slate-700">{definition?.label ?? component.scoreKey}</span><span className="mt-0.5 block text-xs text-slate-400">{definition?.category} · {component.source === "HUMAN_OVERRIDE" ? "Human override" : "CSV input"}</span></span><span className="font-semibold text-slate-800">{component.score} <span className="text-xs font-normal text-slate-400">/ {component.maxScore}</span></span></button>; })}</div></section>
          <section className="panel p-5"><p className="eyebrow">Human review</p><h3 className="mt-1 text-lg font-bold text-slate-900">Override one component</h3><p className="mt-2 text-sm leading-6 text-slate-500">The score input stays auditable: the original value remains visible in Activity and the total recalculates immediately.</p><label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">Component<select className="field mt-1" value={selectedKey} onChange={(event) => selectScore(event.target.value)}>{SCORE_DEFINITIONS.map((definition) => <option key={definition.key} value={definition.key}>{definition.category} · {definition.label}</option>)}</select></label><label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">New score<input className="field mt-1" type="number" min="0" max={selectedDefinition?.max ?? 100} value={newScore} onChange={(event) => setNewScore(Number(event.target.value))} /></label><label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">Reason<textarea className="field mt-1 min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what the public evidence changes…" /></label><button type="button" className="button-primary mt-4 w-full" disabled={saving || !selectedComponent || reason.trim().length < 5} onClick={() => void mutate({ type: "score_override", scoreKey: selectedKey, score: newScore, reason })}>{saving ? "Saving…" : `Save override (${selectedComponent?.score ?? "—"} → ${newScore})`}</button></section>
          <section className="panel p-5"><p className="eyebrow">Status management</p><h3 className="mt-1 text-lg font-bold text-slate-900">Pre-outreach only</h3><p className="mt-2 text-sm leading-6 text-slate-500">Real candidates cannot be moved into contacted or later stages during the assessment.</p><label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">Current status<select className="field mt-1" value={candidate.funnelStatus} onChange={(event) => void mutate({ type: "status", status: event.target.value, reason: statusReason })}>{REAL_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label><label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">Optional reason<input className="field mt-1" value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Why is the candidate moving?" /></label><p className="mt-3 text-xs text-slate-400">Changing the selection saves immediately and creates an audit entry.</p></section>
        </div>
      </div>
      <section className="panel overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><p className="eyebrow">Audit trail</p><h3 className="mt-1 text-lg font-bold text-slate-900">Recent decisions</h3></div>{activity.length ? <div className="divide-y divide-slate-100">{activity.map((item) => <div key={item.id} className="grid gap-2 px-5 py-3 text-sm sm:grid-cols-[180px_1fr_180px]"><time className="text-xs text-slate-400">{formatDate(item.createdAt)}</time><p className="text-slate-700"><span className="font-semibold">{humanize(item.action)}</span>{item.field ? ` · ${humanize(item.field)}` : ""}{item.reason ? <span className="block text-xs text-slate-500">{item.reason}</span> : null}</p><p className="text-xs text-slate-500">{item.previousValue ?? "—"} → {item.newValue ?? "—"}</p></div>)}</div> : <div className="p-5 text-sm text-slate-500">No activity yet.</div>}</section>
    </div>
  );
}
