"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarNav({ tenantId }: { tenantId: string }) {
  const pathname = usePathname();

  const items: Array<{ href: string; label: string }> = [
    { href: `/dashboard/${tenantId}`, label: "Overview" },
    { href: `/dashboard/${tenantId}/upload`, label: "Upload CSV" },
    { href: `/dashboard/${tenantId}/insights`, label: "AI Insights" },
  ];

  return (
    <nav className="mt-2 px-2">
      {items.map((item) => {
        const active =
          item.href === `/dashboard/${tenantId}`
            ? pathname === item.href
            : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "block rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              active
                ? "bg-indigo-600/20 text-indigo-100 ring-1 ring-indigo-600/35"
                : "text-slate-200 hover:bg-indigo-500/20 hover:text-indigo-100",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

