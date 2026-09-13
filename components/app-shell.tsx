"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard", detail: "Funnel overview" },
  { href: "/candidates", label: "Candidates", detail: "Prioritized pipeline" },
  { href: "/discovery", label: "Discovery", detail: "Expansion queue" },
  { href: "/activity", label: "Activity", detail: "Audit trail" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-mist">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-start justify-between lg:block">
            <div>
              <p className="eyebrow">Onely / Growth OS</p>
              <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Creator Outreach</h1>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Evidence-backed acquisition workspace for the Private Beta.</p>
            </div>
            <div className="hidden rounded-xl bg-slate-50 p-3 lg:mt-10 lg:block">
              <p className="text-xs font-semibold text-slate-700">Assessment mode</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Public data only. No messages or emails are sent.</p>
            </div>
          </div>
          <nav aria-label="Primary navigation" className="mt-6 flex gap-2 overflow-x-auto lg:mt-10 lg:block lg:space-y-2">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block min-w-fit rounded-xl px-3 py-2.5 transition lg:px-4 ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={`mt-0.5 hidden text-xs lg:block ${active ? "text-slate-300" : "text-slate-400"}`}>{item.detail}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
