"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ErrorAlert, Loading, PageIntro } from "@/components/ui";
import { SCORE_DEFINITIONS, type ScoreKey } from "@/lib/scoring";

type FormState = {
  candidateId: string;
  candidateOrigin: string;
  name: string;
  brandOrHandle: string;
  segment: string;
  primaryPlatformOrAsset: string;
  publicProfileUrl: string;
  contactType: string;
  contactSourceUrl: string;
  contactValuePublic: string;
  matchReason: string;
  ownedAudienceSignal: string;
  monetizationSignal: string;
  aiAffinity: string;
  networkValueSignal: string;
  verificationLevel: string;
  verifiedAt: string;
  funnelStatus: string;
  outreachStatus: string;
  riskOrCaveat: string;
  evidenceUrl: string;
  evidenceSummary: string;
  scoreInputs: Record<ScoreKey, number>;
};

const initialForm: FormState = {
  candidateId: "",
  candidateOrigin: "discovery",
  name: "",
  brandOrHandle: "",
  segment: "",
  primaryPlatformOrAsset: "",
  publicProfileUrl: "",
  contactType: "Public contact form",
  contactSourceUrl: "",
  contactValuePublic: "",
  matchReason: "",
  ownedAudienceSignal: "",
  monetizationSignal: "",
  aiAffinity: "",
  networkValueSignal: "",
  verificationLevel: "C",
  verifiedAt: new Date().toISOString().slice(0, 10),
  funnelStatus: "discovered",
  outreachStatus: "not_contacted_case_restriction",
  riskOrCaveat: "",
  evidenceUrl: "",
  evidenceSummary: "",
  scoreInputs: Object.fromEntries(SCORE_DEFINITIONS.map((definition) => [definition.key, 0])) as Record<ScoreKey, number>,
};

export default function NewCandidatePage() {
  return <Suspense fallback={<Loading label="Loading candidate form" />}><NewCandidateForm /></Suspense>;
}

function NewCandidateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const discoveryId = Number(searchParams.get("discoveryId") ?? "");
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!discoveryId) return;
    void fetch("/api/discovery", { cache: "no-store" }).then((response) => response.json()).then((items: Array<{ id: number; url: string; source: string }>) => {
      const item = items.find((entry) => entry.id === discoveryId);
      if (item) setForm((current) => ({ ...current, publicProfileUrl: item.url, contactSourceUrl: item.url, candidateOrigin: item.source }));
    }).catch(() => undefined);
  }, [discoveryId]);

  function setValue(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setScore(key: ScoreKey, value: string) {
    setForm((current) => ({ ...current, scoreInputs: { ...current.scoreInputs, [key]: Number(value) } }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, evidence: [{ url: form.evidenceUrl, summary: form.evidenceSummary }], discoveryId: discoveryId || undefined }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to create candidate");
      router.push(`/candidates/${body.candidate?.candidateId ?? body.candidateId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create candidate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro eyebrow="Manual candidate" title="Add candidate" description="Promote a public discovery URL only after entering the evidence and 15 rubric inputs required for a scored candidate." action={<Link href="/discovery" className="button-secondary">← Back to discovery</Link>} />
      {error ? <ErrorAlert message={error} /> : null}
      <form className="space-y-6" onSubmit={submit}>
        <section className="panel p-5"><p className="eyebrow">Identity</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Candidate ID (optional)" value={form.candidateId} onChange={(value) => setValue("candidateId", value)} /><Field label="Name" required value={form.name} onChange={(value) => setValue("name", value)} /><Field label="Brand / handle" required value={form.brandOrHandle} onChange={(value) => setValue("brandOrHandle", value)} /><Field label="Segment" required value={form.segment} onChange={(value) => setValue("segment", value)} /><Field label="Primary platform / asset" required value={form.primaryPlatformOrAsset} onChange={(value) => setValue("primaryPlatformOrAsset", value)} /><Field label="Public profile URL" required type="url" value={form.publicProfileUrl} onChange={(value) => setValue("publicProfileUrl", value)} /><Field label="Contact source URL" required type="url" value={form.contactSourceUrl} onChange={(value) => setValue("contactSourceUrl", value)} /><Field label="Contact value" required value={form.contactValuePublic} onChange={(value) => setValue("contactValuePublic", value)} /><Field label="Contact type" required value={form.contactType} onChange={(value) => setValue("contactType", value)} /><Field label="Origin / source" required value={form.candidateOrigin} onChange={(value) => setValue("candidateOrigin", value)} /></div></section>
        <section className="panel p-5"><p className="eyebrow">Fit context</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><TextArea label="Match reason" required value={form.matchReason} onChange={(value) => setValue("matchReason", value)} /><TextArea label="Owned audience signal" required value={form.ownedAudienceSignal} onChange={(value) => setValue("ownedAudienceSignal", value)} /><TextArea label="Monetization signal" required value={form.monetizationSignal} onChange={(value) => setValue("monetizationSignal", value)} /><TextArea label="AI affinity" required value={form.aiAffinity} onChange={(value) => setValue("aiAffinity", value)} /><TextArea label="Network value signal" required value={form.networkValueSignal} onChange={(value) => setValue("networkValueSignal", value)} /><TextArea label="Risk or caveat" value={form.riskOrCaveat} onChange={(value) => setValue("riskOrCaveat", value)} /></div></section>
        <section className="panel p-5"><p className="eyebrow">Evidence</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Evidence URL" required type="url" value={form.evidenceUrl} onChange={(value) => setValue("evidenceUrl", value)} /><TextArea label="Evidence summary" required value={form.evidenceSummary} onChange={(value) => setValue("evidenceSummary", value)} /></div></section>
        <section className="panel p-5"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">v2.0 score inputs</p><h3 className="mt-1 text-lg font-bold text-slate-900">Enter the evidence-backed rubric values</h3></div><span className="text-xs text-slate-400">Totals are calculated on save</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{SCORE_DEFINITIONS.map((definition) => <label key={definition.key} className="text-xs font-semibold uppercase tracking-wide text-slate-400">{definition.category} · {definition.label}<input className="field mt-1" type="number" min="0" max={definition.max} value={form.scoreInputs[definition.key]} onChange={(event) => setScore(definition.key, event.target.value)} /></label>)}</div></section>
        <section className="panel p-5"><p className="eyebrow">Execution state</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verification<select className="field mt-1" value={form.verificationLevel} onChange={(event) => setValue("verificationLevel", event.target.value)}><option>A</option><option>B</option><option>C</option></select></label><Field label="Verified at" type="date" value={form.verifiedAt} onChange={(value) => setValue("verifiedAt", value)} /><label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Funnel status<select className="field mt-1" value={form.funnelStatus} onChange={(event) => setValue("funnelStatus", event.target.value)}><option value="discovered">Discovered</option><option value="qualified">Qualified</option><option value="verified">Verified</option><option value="ready_for_outreach">Ready for outreach</option></select></label></div></section>
        <div className="flex justify-end gap-3"><Link href="/discovery" className="button-secondary">Cancel</Link><button type="submit" className="button-primary" disabled={saving}>{saving ? "Saving…" : "Create candidate"}</button></div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}{required ? " *" : ""}<input className="field mt-1" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextArea({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}{required ? " *" : ""}<textarea className="field mt-1 min-h-24" required={required} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
