"use client";

import { useEffect, useState } from "react";
import Avatar from "boring-avatars";

// Neon palette: primary green, cyan, magenta, dark surface, muted teal
const CYBERPUNK_PALETTE = ["#00ffaa", "#00e5ff", "#ff00aa", "#0c0c14", "#4a5e5a"];

interface UserAvatarProps {
  /** Deterministic seed — use user ID or email */
  seed: string;
  size?: number;
}

export function UserAvatar({ seed, size = 80 }: UserAvatarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border-2 border-[rgba(0,255,170,0.3)] shadow-[0_0_24px_rgba(0,255,170,0.2)] overflow-hidden shrink-0"
    >
      {mounted && (
        <Avatar
          name={seed || "unknown"}
          variant="pixel"
          size={size}
          colors={CYBERPUNK_PALETTE}
        />
      )}
    </div>
  );
}
