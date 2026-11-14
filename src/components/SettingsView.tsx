"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  Download,
  HardDrive,
  KeyRound,
  Monitor,
  Moon,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Tablet,
  Trash2,
} from "lucide-react";
import type { Settings } from "@/types/music";
import type { PlayerApi } from "@/types/player";
import { EQ_PRESETS } from "@/lib/audio";
import { getApiKey, patchSettings, setApiKey } from "@/lib/store";
import { listVault, removeFromVault } from "@/lib/vault";
import { canInstall, isStandalone, platformHint, promptInstall } from "@/lib/install";
import { formatBytes } from "@/lib/format";
import { Chip, SectionHead } from "./ui";

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="lg p-4" style={{ borderRadius: 24 }}>
      <div className="mb-3">
        <p className="text-[13.5px] font-semibold">{title}</p>
        {hint ? (
          <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="flex gap-1 rounded-2xl p-1"
      style={{ background: "color-mix(in srgb, var(--ink) 6%, transparent)" }}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className="press flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11.5px] font-semibold"
          style={{
            background: value === option.id ? "var(--paper-3)" : "transparent",
            color: value === option.id ? "var(--ink)" : "var(--ink-mute)",
            boxShadow: value === option.id ? "0 1px 5px rgba(0,0,0,.14)" : "none",
          }}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsView({
  settings,
  player,
  vault,
  onRefreshVault,
  onClearLibrary,
}: {
  settings: Settings;
  player: PlayerApi;
  vault: { trackId: string; sizeBytes: number }[];
  onRefreshVault: () => Promise<void>;
  onClearLibrary: () => void;
}) {
  const [keyDraft, setKeyDraft] = useState("");
  const [installed, setInstalled] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [storageNote, setStorageNote] = useState<string | null>(null);

  useEffect(() => {
    setInstalled(isStandalone());
    setInstallable(canInstall());
    const onInstallable = () => setInstallable(true);
    const onInstalled = () => {
      setInstalled(true);
      setInstallable(false);
    };
    window.addEventListener("nspace:installable", onInstallable);
    window.addEventListener("nspace:installed", onInstalled);
    return () => {
      window.removeEventListener("nspace:installable", onInstallable);
      window.removeEventListener("nspace:installed", onInstalled);
    };
  }, []);

  const totalBytes = vault.reduce((sum, entry) => sum + entry.sizeBytes, 0);

  return (
    <div className="anim-fade space-y-3 pb-4">
      <Card title="Appearance" hint="Same palette, tuned for liquid glass in both modes.">
        <Segmented
          value={settings.theme}
          onChange={(theme) => patchSettings({ theme })}
          options={[
            { id: "light", label: "Light", icon: <Sun size={13} /> },
            { id: "dark", label: "Dark", icon: <Moon size={13} /> },
            { id: "system", label: "Auto", icon: <Monitor size={13} /> },
          ]}
        />
      </Card>

      <Card title="Sound" hint="10-band EQ, spatial widening and bass, applied live.">
        <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
          {EQ_PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              active={settings.eqPreset === preset.id}
              onClick={() =>
                patchSettings({ eqPreset: preset.id, eqBands: preset.bands })
              }
            >
              {preset.name}
            </Chip>
          ))}
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[12.5px] font-semibold">Spatial audio</p>
            <p className="text-[11px]" style={{ color: "var(--ink-mute)" }}>
              Wider stage, softer air shelf
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.spatialEnabled}
            aria-label="Spatial audio"
            onClick={() =>
              patchSettings({ spatialEnabled: !settings.spatialEnabled })
            }
            className="press relative h-7 w-12 shrink-0 rounded-full"
            style={{
              background: settings.spatialEnabled
                ? "var(--accent)"
                : "rgba(120,120,130,.3)",
            }}
          >
            <span
              className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
              style={{ left: settings.spatialEnabled ? 22 : 2 }}
            />
          </button>
        </div>

        <div className="py-2">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-semibold">Bass boost</p>
            <span className="mono-num text-[11px]" style={{ color: "var(--ink-mute)" }}>
              {settings.bassBoost}%
            </span>
          </div>
          <input
            type="range"
            className="lg-range mt-1"
            min={0}
            max={100}
            value={settings.bassBoost}
            onChange={(event) =>
              patchSettings({ bassBoost: Number(event.target.value) })
            }
            aria-label="Bass boost"
            style={{ ["--pct" as string]: `${settings.bassBoost}%` }}
          />
        </div>

        <button
          type="button"
          onClick={player.openEq}
          className="press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-[12.5px] font-semibold"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <SlidersHorizontal size={14} /> Open the full equaliser
        </button>

        <div className="mt-3">
          <p className="mb-1.5 text-[12px] font-semibold">Stream quality</p>
          <Segmented
            value={settings.quality}
            onChange={(quality) => patchSettings({ quality })}
            options={[
              { id: "hi-res", label: "Hi-Res" },
              { id: "balanced", label: "Balanced" },
              { id: "saver", label: "Data saver" },
            ]}
          />
        </div>
      </Card>

      <Card
        title="Offline vault"
        hint={`${vault.length} tracks stored on this device · ${formatBytes(totalBytes)}`}
      >
        <div className="flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <HardDrive size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(120,120,130,.2)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (totalBytes / (1024 * 1024 * 800)) * 100)}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
            <p className="mt-1 text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
              Browsers usually allow around 800 MB to a few GB per site.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            const entries = await listVault();
            await Promise.all(entries.map((entry) => removeFromVault(entry.trackId)));
            await onRefreshVault();
            setStorageNote("Vault cleared");
            window.setTimeout(() => setStorageNote(null), 2200);
          }}
          className="press mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[12.5px] font-semibold"
          style={{ background: "rgba(120,120,130,.12)", color: "var(--ink-soft)" }}
        >
          <Trash2 size={13} /> {storageNote || "Clear all downloads"}
        </button>
      </Card>

      <Card
        title="AI DJ key"
        hint="Optional. Without a key the DJ still works using the local intent engine."
      >
        <div className="mb-2 flex items-center justify-between rounded-2xl px-3 py-2"
          style={{ background: "color-mix(in srgb, var(--ink) 5%, transparent)" }}>
          <span className="text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
            {settings.hasApiKey && settings.apiKeyMasked
              ? `Saved: ${settings.apiKeyMasked}`
              : "No key saved"}
          </span>
          {settings.hasApiKey ? (
            <button
              type="button"
              onClick={() => {
                setApiKey("");
                setKeyDraft("");
                player.toast("Key removed");
              }}
              className="press text-[11.5px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Remove
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <div className="lg lg-flat flex min-w-0 flex-1 items-center gap-2 px-3 py-2" style={{ borderRadius: 16 }}>
            <KeyRound size={14} style={{ color: "var(--ink-mute)" }} />
            <input
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
              type="password"
              placeholder={getApiKey() ? "••••••••" : "sk-… or sk-ant-…"}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none"
              style={{ color: "var(--ink)" }}
              aria-label="Provider API key"
            />
          </div>
          <button
            type="button"
            disabled={!keyDraft.trim()}
            onClick={() => {
              setApiKey(keyDraft.trim());
              setKeyDraft("");
              player.toast("Key saved on this device");
            }}
            className="press shrink-0 rounded-2xl px-4 text-[12px] font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            Save
          </button>
        </div>
        <p className="mt-2 text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
          Stored in this browser only, never sent anywhere except the provider you choose.
        </p>
      </Card>

      <Card
        title="Install as an app"
        hint="One codebase, tuned for each screen size."
      >
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Smartphone size={16} />, label: "iPhone", note: "Full screen" },
            { icon: <Tablet size={16} />, label: "iPad", note: "Split layout" },
            { icon: <Monitor size={16} />, label: "Windows", note: "Desktop window" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl px-2 py-3 text-center"
              style={{ background: "color-mix(in srgb, var(--ink) 5%, transparent)" }}
            >
              <span style={{ color: "var(--accent)" }}>{item.icon}</span>
              <p className="mt-1 text-[11.5px] font-semibold">{item.label}</p>
              <p className="text-[10px]" style={{ color: "var(--ink-faint)" }}>
                {item.note}
              </p>
            </div>
          ))}
        </div>

        {installed ? (
          <p
            className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[12.5px] font-semibold"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <Check size={14} /> Running as an installed app
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={async () => {
                const outcome = await promptInstall();
                if (outcome === "unavailable") player.toast(platformHint());
              }}
              className="press mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[12.5px] font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              <Download size={13} />
              {installable ? "Install N Space" : "How to install"}
            </button>
            <p className="mt-2 text-center text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
              {platformHint()}
            </p>
          </>
        )}
      </Card>

      <Card title="Data and about">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onClearLibrary}
            className="press flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-[12.5px] font-semibold"
            style={{ background: "rgba(120,120,130,.1)" }}
          >
            Clear library and history
            <Trash2 size={14} style={{ color: "var(--accent)" }} />
          </button>
          <div className="flex items-center justify-between px-3 py-1 text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
            <span>Version</span>
            <span className="mono-num">1.0.0 · Liquid</span>
          </div>
          <div className="flex items-center justify-between px-3 py-1 text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
            <span>Streaming engine</span>
            <span>Hi-Res proxy, live</span>
          </div>
        </div>
      </Card>

      <SectionHead title="" />
    </div>
  );
}
