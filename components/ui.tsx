import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-intro flex flex-col sm:flex-row sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="page-title">{title}</h2>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "teal" | "amber" | "rose" | "blue" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function scoreTone(value: number) {
  if (value >= 85) return "teal" as const;
  if (value >= 65) return "blue" as const;
  if (value >= 50) return "amber" as const;
  return "slate" as const;
}

export function ErrorAlert({ message }: { message: string }) {
  return <div role="alert" className="alert alert-error">{message}</div>;
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><span className="loading-skeleton" aria-hidden="true" /><span className="loading-skeleton" aria-hidden="true" /><span>{label}…</span></div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><span className="empty-state-mark" aria-hidden="true">+</span><p className="empty-state-title">{title}</p><p className="empty-state-copy">{description}</p></div>;
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
