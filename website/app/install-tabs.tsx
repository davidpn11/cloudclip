"use client";

import { type KeyboardEvent, useRef, useState } from "react";

export type Agent = { name: string; commands: string[]; note: string };

// One tab per agent. Arrow keys, Home and End move between tabs, per the WAI-ARIA tabs pattern.
export function InstallTabs({ agents }: { agents: Agent[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const agent = agents[active];

  const onKeyDown = (e: KeyboardEvent) => {
    const last = agents.length - 1;
    const next =
      e.key === "ArrowRight" ? (active === last ? 0 : active + 1)
      : e.key === "ArrowLeft" ? (active === 0 ? last : active - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="tabs">
      <div className="tablist" role="tablist" aria-label="Agent" onKeyDown={onKeyDown}>
        {agents.map((a, i) => (
          <button
            key={a.name}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`tab-${i}`}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls="install-panel"
            tabIndex={i === active ? 0 : -1}
            className={i === active ? "primary" : undefined}
            onClick={() => setActive(i)}
          >
            {a.name}
          </button>
        ))}
      </div>
      {agent && (
        <div className="card glass" id="install-panel" role="tabpanel" aria-labelledby={`tab-${active}`}>
          <pre className="code">{agent.commands.join("\n")}</pre>
          <p className="muted">{agent.note}</p>
        </div>
      )}
    </div>
  );
}
