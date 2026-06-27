"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface FinanceNavProps {
  reviewCount?: number;
}

export function FinanceNav({ reviewCount }: FinanceNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2">
      <NavTab href="/under-finance" active={pathname === "/under-finance"}>
        ◆ Dashboard
      </NavTab>
      <NavTab
        href="/under-finance/review"
        active={pathname.startsWith("/under-finance/review")}
      >
        ⚑ Review
        {typeof reviewCount === "number" && reviewCount > 0 && (
          <span className="rounded-full bg-[rgba(255,176,0,0.15)] px-1.5 text-[10px] text-[#ffb000]">
            {reviewCount}
          </span>
        )}
      </NavTab>
      <NavTab
        href="/under-finance/categories"
        active={pathname.startsWith("/under-finance/categories")}
      >
        ▦ Categories
      </NavTab>
    </nav>
  );
}

function NavTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-xl border px-4 py-2 font-mono text-sm no-underline transition-all duration-300"
      style={{
        borderColor: active ? "rgba(0,255,170,0.4)" : "rgba(0,255,170,0.1)",
        background: active ? "rgba(0,255,170,0.08)" : "var(--bg-card)",
        color: active ? "var(--neon-primary)" : "var(--text-secondary)",
      }}
    >
      {children}
    </Link>
  );
}
