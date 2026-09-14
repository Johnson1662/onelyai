"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard", detail: "Funnel overview", index: "01" },
  { href: "/candidates", label: "Candidates", detail: "Prioritized pipeline", index: "02" },
  { href: "/discovery", label: "Discovery", detail: "Expansion queue", index: "03" },
  { href: "/activity", label: "Activity", detail: "Audit trail", index: "04" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-mist">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="sidebar border-b border-slate-200 px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-start justify-between gap-5 lg:block">
            <div>
              <div className="brand-lockup">
                <span className="brand-mark" aria-hidden="true">O</span>
                <div>
                  <p className="brand-kicker">Onely / Growth OS</p>
                  <h1 className="brand-title">Creator outreach</h1>
                </div>
              </div>
              <p className="brand-copy">Evidence-backed acquisition workspace for the private beta.</p>
            </div>
            <div className="sidebar-note hidden lg:mt-10 lg:block">
              <p className="sidebar-note-title">Assessment mode</p>
              <p className="sidebar-note-copy">Public data only. No messages or emails are sent.</p>
            </div>
          </div>
          <nav aria-label="Primary navigation" className="sidebar-nav mt-6 flex gap-2 overflow-x-auto lg:mt-10 lg:block lg:space-y-2">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "nav-link-active" : ""}`}
                >
                  <span className="nav-index" aria-hidden="true">{item.index}</span>
                  <span className="nav-label"><span className="block text-sm font-semibold">{item.label}</span><span className="nav-detail">{item.detail}</span></span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="app-main min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
