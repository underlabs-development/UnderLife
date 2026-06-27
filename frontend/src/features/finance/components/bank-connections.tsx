"use client";

import { useState, useTransition } from "react";
import type { Aspsp, BankConnection } from "../models/finance.model";
import {
  deleteBankConnection,
  listAspsps,
  startBankConnection,
  syncBankConnection,
} from "../actions/banksync";
import { track } from "../stores/activity-store";

interface BankConnectionsProps {
  connections: BankConnection[];
  onChanged: () => void;
}

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  active: { color: "#00ffaa", label: "Connected" },
  expired: { color: "#ffb000", label: "Consent expired" },
  error: { color: "#ff00aa", label: "Error" },
  pending: { color: "#8ba4a0", label: "Pending" },
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.floor(ms / 86_400_000);
}

export function BankConnections({ connections, onChanged }: BankConnectionsProps) {
  const [picking, setPicking] = useState(false);
  const [aspsps, setAspsps] = useState<Aspsp[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const openPicker = () => {
    setError("");
    setPicking(true);
    if (aspsps.length === 0) {
      startTransition(async () => {
        const res = await listAspsps("IT");
        if ("data" in res) setAspsps(res.data);
        else setError(res.error);
      });
    }
  };

  const connect = (aspspName: string) => {
    if (!aspspName) return;
    setError("");
    startTransition(async () => {
      const res = await startBankConnection(aspspName, "IT");
      if ("data" in res) {
        // Hand off to the bank's strong-customer-authentication page.
        window.location.href = res.data.redirect_url;
      } else {
        setError(res.error);
      }
    });
  };

  const sync = (conn: BankConnection) => {
    setError("");
    startTransition(async () => {
      const res = await track(
        `Syncing ${conn.aspsp_name}…`,
        syncBankConnection(conn.id),
      );
      if ("error" in res) setError(res.error);
      onChanged();
    });
  };

  const remove = (id: number) => {
    startTransition(async () => {
      await deleteBankConnection(id);
      onChanged();
    });
  };

  return (
    <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
          <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> Bank
          Connections
        </h2>
        <button
          type="button"
          onClick={picking ? () => setPicking(false) : openPicker}
          className="rounded-lg border border-[rgba(0,255,170,0.2)] bg-[rgba(0,255,170,0.06)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.5)] cursor-pointer"
        >
          {picking ? "Cancel" : "+ Connect bank"}
        </button>
      </div>

      {picking && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(0,255,170,0.12)] bg-[var(--bg-surface)] p-3">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={isPending}
            className="flex-1 bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none [&>option]:bg-[var(--bg-surface)]"
          >
            <option value="">
              {isPending && aspsps.length === 0
                ? "Loading Italian banks…"
                : "Select your bank…"}
            </option>
            {aspsps.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => connect(selected)}
            disabled={isPending || !selected}
            className="rounded-lg border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] disabled:opacity-40 cursor-pointer"
          >
            Connect
          </button>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-3 py-2 font-mono text-xs text-[var(--neon-magenta)]">
          {error}
        </p>
      )}

      {connections.length === 0 ? (
        <p className="py-6 text-center font-mono text-xs text-[var(--text-muted)]">
          No banks connected. Link an Italian bank to auto-import transactions.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {connections.map((c) => {
            const style = STATUS_STYLE[c.status] ?? STATUS_STYLE.pending;
            const days = daysUntil(c.consent_valid_until);
            const expiringSoon = days !== null && days <= 14;
            return (
              <li
                key={c.id}
                className="rounded-xl border border-[rgba(0,255,170,0.06)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: style.color, boxShadow: `0 0 6px ${style.color}` }}
                    />
                    <span className="font-mono text-sm text-[var(--text-primary)]">
                      {c.aspsp_name}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: style.color }}>
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(c.status === "expired" || c.status === "error") && (
                      <button
                        type="button"
                        onClick={() => connect(c.aspsp_name)}
                        disabled={isPending}
                        className="rounded-md border border-[rgba(255,176,0,0.4)] px-2 py-1 font-mono text-[10px] text-[#ffb000] transition-all duration-200 hover:border-[rgba(255,176,0,0.7)] disabled:opacity-40 cursor-pointer"
                      >
                        Reconnect
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => sync(c)}
                      disabled={isPending || c.status !== "active"}
                      className="rounded-md border border-[rgba(0,255,170,0.25)] px-2 py-1 font-mono text-[10px] text-[var(--neon-primary)] transition-all duration-200 hover:border-[rgba(0,255,170,0.5)] disabled:opacity-30 cursor-pointer"
                    >
                      Sync now
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      disabled={isPending}
                      aria-label="Remove connection"
                      className="font-mono text-xs text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--neon-magenta)] cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {c.accounts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.accounts.map((a) => (
                      <span
                        key={a.id}
                        className="rounded-md border border-[rgba(0,255,170,0.1)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
                      >
                        {a.name || a.iban_masked || a.currency}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-x-4 font-mono text-[10px] text-[var(--text-muted)]">
                  {c.consent_valid_until && (
                    <span style={expiringSoon ? { color: "#ffb000" } : undefined}>
                      Consent {days !== null && days >= 0 ? `expires in ${days}d` : "expired"}
                    </span>
                  )}
                  {c.last_synced_at && (
                    <span>
                      Last sync {new Date(c.last_synced_at).toLocaleDateString("en-GB")}
                    </span>
                  )}
                  {c.error_detail && (
                    <span className="text-[var(--neon-magenta)]">{c.error_detail}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
