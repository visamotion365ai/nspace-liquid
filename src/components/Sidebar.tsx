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

const ITEMS: { id: TabId; label: string; icon: React.ElementType; hint: string }[] = [
  { id: "home", label: "Listen", icon: Home, hint: "Live mixes" },
  { id: "search", label: "Search", icon: Search, hint: "Whole catalogue" },
  { id: "library", label: "Library", icon: Library, hint: "Saved and offline" },
  { id: "agent", label: "AI DJ", icon: Sparkles, hint: "Ask for anything" },
  { id: "settings", label: "Settings", icon: Settings2, hint: "Sound and app" },
];

export function Sidebar({
  tab,
  onTab,
  device,
}: {
  tab: TabId;
  onTab: (tab: TabId) => void;
  device: DeviceClass;
}) {
  return (
    <nav
      className="hidden flex-col gap-2 py-4 pl-4 pr-2 md:flex"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      aria-label="Primary"
    >
      <div className="px-2.5 pb-5 pt-1">
        <p className="display text-[26px] leading-none">N Space</p>
        <p className="eyebrow mt-1.5">Liquid Glass</p>
      </div>

      <div className="lg lg-panel flex flex-col gap-1 p-2">
        {ITEMS.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTab(item.id)}
              aria-current={active ? "page" : undefined}
              className="press tap-focus relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
              style={{
                background: active
                  ? "color-mix(in srgb, var(--accent) 13%, transparent)"
                  : "transparent",
                boxShadow: active
                  ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 26%, transparent)"
                  : undefined,
              }}
            >
              <Icon
                size={17}
                strokeWidth={active ? 2.4 : 2}
                style={{ color: active ? "var(--accent)" : "var(--ink-mute)" }}
              />
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[13.5px] font-semibold leading-tight"
                  style={{ color: active ? "var(--accent)" : "var(--ink)" }}
                >
                  {item.label}
                </span>
                <span
                  className="block truncate text-[11px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {item.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="lg lg-flat mt-auto p-3" style={{ borderRadius: 22 }}>
        <p className="eyebrow">Engine</p>
        <p className="mt-1 text-[12.5px] font-semibold leading-snug">
          Hi-Res streaming
        </p>
        <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
          {device === "desktop"
            ? "Desktop layout · keyboard ready"
            : "Tablet layout · touch ready"}
        </p>
      </div>
    </nav>
  );
}
