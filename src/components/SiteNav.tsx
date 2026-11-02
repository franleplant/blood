"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Charts" },
  { href: "/data", label: "Data" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 lg:gap-6 lg:px-5 lg:py-3">
        <Link
          href="/"
          className="inline-flex min-h-11 min-w-0 items-center truncate font-semibold tracking-tight text-slate-900 lg:min-h-0"
        >
          Blood Markers
        </Link>
        <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:gap-1">
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium lg:min-h-0 lg:px-2.5 lg:py-1 ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
