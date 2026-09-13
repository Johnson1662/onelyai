import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "teal" | "amber" | "rose" | "blue" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-600",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}>{children}</span>;
}

export function scoreTone(value: number) {
  if (value >= 85) return "teal" as const;
  if (value >= 65) return "blue" as const;
  if (value >= 50) return "amber" as const;
  return "slate" as const;
}

export function ErrorAlert({ message }: { message: string }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>;
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return <div className="py-10 text-center text-sm text-slate-500">{label}…</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center"><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
