"use client";

import React from "react";
import {
  Home,
  Library,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { DeviceClass, TabId } from "@/types/music";

const ITEMS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Listen", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "library", label: "Library", icon: Library },
  { id: "agent", label: "AI DJ", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings2 },
];

export function TabBar({
  tab,
  onTab,
  device,
}: {
  tab: TabId;
  onTab: (tab: TabId) => void;
  device: DeviceClass;
}) {
  if (device !== "phone") return null;

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center px-3 md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      <nav
        className="lg lg-strong lg-round flex w-full max-w-[430px] items-stretch justify-between px-1.5 py-1.5"
        aria-label="Primary"
      >
        {ITEMS.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTab(item.id)}
              aria-current={active ? "page" : undefined}
              className="press relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2"
              style={{ color: active ? "var(--accent)" : "var(--ink-mute)" }}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[9.5px] font-semibold tracking-[0.01em]">
                {item.label}
              </span>
              {active ? (
                <span
                  className="absolute -bottom-0.5 h-1 w-1 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
