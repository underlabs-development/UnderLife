"use client";

import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 30;

export function ParticleField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = document.createElement("div");
      const size = Math.random() * 2 + 1;
      const left = Math.random() * 100;
      const duration = Math.random() * 20 + 15;
      const delay = Math.random() * 20;

      particle.style.cssText = `
        position: absolute;
        bottom: -10px;
        left: ${left}%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: var(--neon-primary);
        opacity: 0;
        animation: float ${duration}s linear ${delay}s infinite;
        pointer-events: none;
      `;

      container.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach((p) => p.remove());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
