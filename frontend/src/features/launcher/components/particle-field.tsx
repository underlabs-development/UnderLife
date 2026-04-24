"use client";

import { useEffect, useState } from "react";

const PARTICLE_COUNT = 30;

export function ParticleField() {
  const [particles, setParticles] = useState<Array<{ id: number; size: number; left: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      newParticles.push({
        id: i,
        size: Math.random() * 2 + 1,
        left: Math.random() * 100,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 20,
      });
    }
    setParticles(newParticles);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            bottom: "-10px",
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: "50%",
            background: "var(--neon-primary)",
            animation: `float ${p.duration}s linear -${p.delay}s infinite`,
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}
