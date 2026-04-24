"use client";

import Link from "next/link";
import type { AppItem } from "../models/app-item.model";
import { AppIcon } from "./app-icon";

interface AppTileProps {
  app: AppItem;
  index: number;
}

/* i18n-ready: all user-facing strings below are centralized for future Tolgee extraction */
const LABELS = {
  comingSoon: "Coming Soon",
  launch: "Launch",
};

export function AppTile({ app, index }: AppTileProps) {
  const { id, name, description, icon, route, status } = app;
  const isActive = status === "active";

  const tileContent = (
    <div
      id={`app-tile-${id}`}
      className="group relative flex flex-col items-center gap-4 rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-8 transition-all duration-300 ease-out hover:border-[rgba(0,255,170,0.3)] hover:bg-[var(--bg-card-hover)] hover:shadow-[0_0_30px_rgba(0,255,170,0.15),0_0_60px_rgba(0,255,170,0.05)] cursor-pointer"
      style={{
        animation: `tileEnter 0.6s ease-out ${index * 0.1}s both`,
      }}
    >
      {/* Glow line at top */}
      <div
        className="absolute top-0 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--neon-primary)] to-transparent transition-all duration-500 group-hover:w-3/4"
      />

      {/* Icon container */}
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-[rgba(0,255,170,0.12)] bg-gradient-to-br from-[rgba(0,255,170,0.05)] to-transparent transition-all duration-300 group-hover:border-[rgba(0,255,170,0.3)] group-hover:shadow-[0_0_20px_rgba(0,255,170,0.2)]"
      >
        <AppIcon
          icon={icon}
          className="h-8 w-8 text-[var(--neon-primary)] transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(0,255,170,0.6)]"
        />
      </div>

      {/* App name */}
      <h3
        className="text-lg font-semibold tracking-wide text-[var(--text-primary)] font-mono transition-all duration-300 group-hover:text-[var(--neon-primary)] group-hover:drop-shadow-[0_0_8px_rgba(0,255,170,0.4)]"
      >
        {name}
      </h3>

      {/* Description */}
      <p className="text-center text-sm leading-relaxed text-[var(--text-secondary)]">
        {description}
      </p>

      {/* Status badge */}
      {!isActive && (
        <span
          className="rounded-full border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.08)] px-3 py-1 text-xs font-mono text-[var(--neon-magenta)]"
        >
          {LABELS.comingSoon}
        </span>
      )}

      {/* Launch indicator */}
      {isActive && (
        <div
          className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] transition-all duration-300 group-hover:text-[var(--neon-primary)]"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--neon-primary)] opacity-60 group-hover:opacity-100 group-hover:shadow-[0_0_6px_rgba(0,255,170,0.8)]"
          />
          {LABELS.launch}
        </div>
      )}

      {/* Corner accents */}
      <div
        className="pointer-events-none absolute top-2 left-2 h-3 w-3 border-t border-l border-[rgba(0,255,170,0.15)] transition-all duration-300 group-hover:border-[rgba(0,255,170,0.4)]"
      />
      <div
        className="pointer-events-none absolute right-2 bottom-2 h-3 w-3 border-r border-b border-[rgba(0,255,170,0.15)] transition-all duration-300 group-hover:border-[rgba(0,255,170,0.4)]"
      />
    </div>
  );

  if (!isActive) {
    return tileContent;
  }

  return (
    <Link href={route} className="no-underline">
      {tileContent}
    </Link>
  );
}
