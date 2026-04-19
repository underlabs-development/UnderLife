"use client";

import type { AppItem } from "../models/app-item.model";
import { AppTile } from "./app-tile";

interface AppGridProps {
  apps: AppItem[];
}

export function AppGrid({ apps }: AppGridProps) {
  return (
    <section id="app-grid" className="w-full px-6 pb-16">
      <div
        className="mx-auto grid w-full max-w-6xl gap-6"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        }}
      >
        {apps.map((app, index) => (
          <AppTile key={app.id} app={app} index={index} />
        ))}
      </div>
    </section>
  );
}
