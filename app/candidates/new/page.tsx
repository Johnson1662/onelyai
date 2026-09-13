"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorAlert, Loading, PageIntro, scoreTone } from "@/components/ui";
import {
  CONTACT_CHANNELS,
  CONTENT_FREQUENCIES,
  DEFAULT_FACTS,
  scoreFacts,
  TEAM_SIZES,
  type CandidateFacts,
  type ContactChannel,
} from "@/lib/scoring";

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
  facts: CandidateFacts;
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
  facts: { ...DEFAULT_FACTS, contactChannels: ["contact_form"] },
};

export default function NewCandidatePage() {
  return <Suspense fallback={<Loading label="Loading candidate form" />}><NewCandidateForm /></Suspense>;
}

function NewCandidateForm() {
  const searchParams = useSearchParams();
  const discoveryId = Number(searchParams.get("discoveryId") ?? "");
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const score = scoreFacts(form.facts);

  useEffect(() => {
    if (!discoveryId) return;
    void fetch("/api/discovery", { cache: "no-store" }).then((response) => response.json()).then((items: Array<{ id: number; url: string; source: string }>) => {
      const item = items.find((entry) => entry.id === discoveryId);
      if (item) setForm((current) => ({ ...current, publicProfileUrl: item.url, contactSourceUrl: item.url, candidateOrigin: item.source }));
    }).catch(() => undefined);
  }, [discoveryId]);

  function setValue(key: Exclude<keyof FormState, "facts">, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateFacts(update: Partial<CandidateFacts>) {
    setForm((current) => ({ ...current, facts: { ...current.facts, ...update } }));
  }

  function toggleContact(channel: ContactChannel, checked: boolean) {
    const channels = checked
      ? [...new Set([...form.facts.contactChannels, channel])]
      : form.facts.contactChannels.filter((item) => item !== channel);
    updateFacts({ contactChannels: channels });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, evidence: [{ url: form.evidenceUrl, summary: form.evidenceSummary }], discoveryId: discoveryId || undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to create candidate");
      window.location.assign(`/candidates/${body.candidate?.candidateId ?? body.candidateId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create candidate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro eyebrow="Manual candidate" title="Add candidate" description="Record public facts once. Local TypeScript rules calculate the 15 component scores and keep the reasoning visible." action={<Link href="/discovery" className="button-secondary">← Back to discovery</Link>} />
      {error ? <ErrorAlert message={error} /> : null}
      <form className="space-y-6" onSubmit={submit}>
        <section className="panel p-5"><p className="eyebrow">Identity</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Candidate ID (optional)" value={form.candidateId} onChange={(value) => setValue("candidateId", value)} /><Field label="Name" required value={form.name} onChange={(value) => setValue("name", value)} /><Field label="Brand / handle" required value={form.brandOrHandle} onChange={(value) => setValue("brandOrHandle", value)} /><Field label="Segment" required value={form.segment} onChange={(value) => setValue("segment", value)} /><Field label="Primary platform / asset" required value={form.primaryPlatformOrAsset} onChange={(value) => setValue("primaryPlatformOrAsset", value)} /><Field label="Public profile URL" required type="url" value={form.publicProfileUrl} onChange={(value) => setValue("publicProfileUrl", value)} /><Field label="Contact source URL" required type="url" value={form.contactSourceUrl} onChange={(value) => setValue("contactSourceUrl", value)} /><Field label="Contact value" required value={form.contactValuePublic} onChange={(value) => setValue("contactValuePublic", value)} /><Field label="Contact type" required value={form.contactType} onChange={(value) => setValue("contactType", value)} /><Field label="Origin / source" required value={form.candidateOrigin} onChange={(value) => setValue("candidateOrigin", value)} /></div></section>

        <section className="panel p-5"><p className="eyebrow">Evidence</p><p className="mt-2 text-sm leading-6 text-slate-500">Use public sources for the facts below. This candidate-level evidence is retained with the score; the app does not invent one source per component.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Evidence URL" required type="url" value={form.evidenceUrl} onChange={(value) => setValue("evidenceUrl", value)} /><TextArea label="Evidence summary" required value={form.evidenceSummary} onChange={(value) => setValue("evidenceSummary", value)} /></div></section>

        <section className="panel p-5"><p className="eyebrow">Public facts</p><p className="mt-2 text-sm leading-6 text-slate-500">Check only facts supported by the public evidence. Leaving a fact blank means no positive signal is recorded.</p><div className="mt-5 space-y-6"><div><h3 className="text-base font-bold text-slate-900">Audience and business</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><FactCheckbox label="Owns an audience" checked={form.facts.ownedAudience} onChange={(checked) => updateFacts({ ownedAudience: checked })} /><FactCheckbox label="Newsletter" checked={form.facts.newsletter} onChange={(checked) => updateFacts({ newsletter: checked })} /><FactCheckbox label="Free community" checked={form.facts.community} onChange={(checked) => updateFacts({ community: checked })} /><FactCheckbox label="Paid community" checked={form.facts.paidCommunity} onChange={(checked) => updateFacts({ paidCommunity: checked })} /><FactCheckbox label="Course or education" checked={form.facts.course} onChange={(checked) => updateFacts({ course: checked })} /><FactCheckbox label="Coaching or consulting" checked={form.facts.coaching} onChange={(checked) => updateFacts({ coaching: checked })} /><FactCheckbox label="Membership" checked={form.facts.membership} onChange={(checked) => updateFacts({ membership: checked })} /><FactCheckbox label="E-commerce or products" checked={form.facts.ecommerce} onChange={(checked) => updateFacts({ ecommerce: checked })} /><FactCheckbox label="Affiliate revenue" checked={form.facts.affiliate} onChange={(checked) => updateFacts({ affiliate: checked })} /><FactCheckbox label="Brand deals" checked={form.facts.brandDeal} onChange={(checked) => updateFacts({ brandDeal: checked })} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><NumberField label="Active content platforms" value={form.facts.activePlatformCount} onChange={(value) => updateFacts({ activePlatformCount: value })} /><SelectField label="Content frequency" value={form.facts.contentFrequency} options={CONTENT_FREQUENCIES} onChange={(value) => updateFacts({ contentFrequency: value as CandidateFacts["contentFrequency"] })} /></div></div>

          <div><h3 className="text-base font-bold text-slate-900">AI, contact and activation</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><FactCheckbox label="Uses AI in workflow" checked={form.facts.aiUsage} onChange={(checked) => updateFacts({ aiUsage: checked })} /><FactCheckbox label="AI-native business" checked={form.facts.aiNative} onChange={(checked) => updateFacts({ aiNative: checked })} /><FactCheckbox label="Virtual / AI creator" checked={form.facts.virtualCreator} onChange={(checked) => updateFacts({ virtualCreator: checked })} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><SelectField label="Team size" value={form.facts.teamSize} options={TEAM_SIZES} onChange={(value) => updateFacts({ teamSize: value as CandidateFacts["teamSize"] })} /><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Public contact paths</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{CONTACT_CHANNELS.map((channel) => <FactCheckbox key={channel} label={channel.replaceAll("_", " ")} checked={form.facts.contactChannels.includes(channel)} onChange={(checked) => toggleContact(channel, checked)} />)}</div></div></div></div>

          <div><h3 className="text-base font-bold text-slate-900">Network and distribution</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><FactCheckbox label="Creator educator" checked={form.facts.creatorEducator} onChange={(checked) => updateFacts({ creatorEducator: checked })} /><FactCheckbox label="Manages creators" checked={form.facts.managesCreators} onChange={(checked) => updateFacts({ managesCreators: checked })} /><FactCheckbox label="Agency or studio" checked={form.facts.agencyOrStudio} onChange={(checked) => updateFacts({ agencyOrStudio: checked })} /><FactCheckbox label="Audience includes creators" checked={form.facts.creatorAudience} onChange={(checked) => updateFacts({ creatorAudience: checked })} /></div><div className="mt-4 max-w-sm"><NumberField label="Distribution channels" value={form.facts.distributionChannelCount} onChange={(value) => updateFacts({ distributionChannelCount: value })} /></div></div>
        </div></section>

        <section className="panel p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Local score preview</p><h3 className="mt-1 text-lg font-bold text-slate-900">Rules calculate all 15 components</h3><p className="mt-2 text-sm leading-6 text-slate-500">No model call or hidden score input is used. The saved component values can still be overridden by a human with a reason.</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">facts rules · v2.1</span></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><Total label="Fit" value={score.scores.fit} /><Total label="Activation" value={score.scores.activation} /><Total label="Network" value={score.scores.network} /><Total label="Priority" value={score.scores.priorityScore} tone={scoreTone(score.scores.priorityScore)} /></div><div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">{score.signals.map((signal) => <div key={signal.key} className="grid gap-1 px-3 py-3 text-sm sm:grid-cols-[1fr_70px_2fr] sm:items-center"><span className="font-medium text-slate-700">{signal.category} · {signal.label}</span><span className="font-semibold text-slate-900 sm:text-center">{signal.score}/{signal.max}</span><span className="text-xs leading-5 text-slate-500">{signal.reason}</span></div>)}</div></section>

        <section className="panel p-5"><p className="eyebrow">Fit context and execution</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><TextArea label="Match reason" required value={form.matchReason} onChange={(value) => setValue("matchReason", value)} /><TextArea label="Owned audience signal" required value={form.ownedAudienceSignal} onChange={(value) => setValue("ownedAudienceSignal", value)} /><TextArea label="Monetization signal" required value={form.monetizationSignal} onChange={(value) => setValue("monetizationSignal", value)} /><TextArea label="AI affinity" required value={form.aiAffinity} onChange={(value) => setValue("aiAffinity", value)} /><TextArea label="Network value signal" required value={form.networkValueSignal} onChange={(value) => setValue("networkValueSignal", value)} /><TextArea label="Risk or caveat" value={form.riskOrCaveat} onChange={(value) => setValue("riskOrCaveat", value)} /></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><SelectField label="Verification" value={form.verificationLevel} options={["A", "B", "C"]} onChange={(value) => setValue("verificationLevel", value)} /><Field label="Verified at" type="date" value={form.verifiedAt} onChange={(value) => setValue("verifiedAt", value)} /><SelectField label="Funnel status" value={form.funnelStatus} options={["discovered", "qualified", "verified", "ready_for_outreach"]} onChange={(value) => setValue("funnelStatus", value)} /></div></section>

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

function FactCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}<input className="field mt-1" type="number" min="0" max="10" value={value} onChange={(event) => { const next = Number(event.target.value); onChange(Number.isFinite(next) ? Math.min(10, Math.max(0, next)) : 0); }} /></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}<select className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Total({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "teal" | "amber" | "rose" | "blue" }) {
  const colors = { slate: "text-slate-900", teal: "text-teal-700", amber: "text-amber-700", rose: "text-rose-700", blue: "text-blue-700" };
  return <div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-400">{label}</p><p className={`mt-1 text-2xl font-bold ${colors[tone]}`}>{value}</p></div>;
}
