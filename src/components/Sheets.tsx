"use client";

import React from "react";
import { X, Sparkles } from "lucide-react";
import type { PlayerApi } from "@/types/player";
import { EQ_LABELS, EQ_PRESETS } from "@/lib/audio";
import { formatTime } from "@/lib/format";
import { Artwork, Chip, EqBars } from "./ui";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div
        className="anim-fade absolute inset-0"
        style={{ background: "rgba(10,10,14,.34)", backdropFilter: "blur(12px)" }}
        onClick={onClose}
      />
      <div
        className="anim-sheet lg lg-strong sm:anim-pop relative w-full sm:w-[440px]"
        style={{
          borderRadius: "30px 30px 0 0",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          maxHeight: "86dvh",
        }}
      >
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <span
            className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full sm:hidden"
            style={{ background: "rgba(120,120,130,.3)" }}
          />
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press grid h-8 w-8 place-items-center rounded-full"
            style={{ color: "var(--ink-mute)" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="scroll-area max-h-[72dvh] overflow-y-auto px-4 pb-4 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export function QueueSheet({ player }: { player: PlayerApi }) {
  if (!player.queue.length) {
    return (
      <p className="px-2 py-6 text-center text-[13px]" style={{ color: "var(--ink-mute)" }}>
        Queue is empty. Play something and it will show up here.
      </p>
    );
  }
  return (
    <div className="grid gap-1 pb-2">
      {player.queue.map((track, index) => {
        const active = player.current?.id === track.id;
        return (
          <button
            key={`${track.id}-${index}`}
            type="button"
            onClick={() => player.play(track, player.queue)}
            className="press flex items-center gap-2.5 rounded-2xl px-2 py-2 text-left"
            style={{
              background: active
                ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                : "transparent",
            }}
          >
            <span
              className="mono-num w-4 text-center text-[11px]"
              style={{ color: "var(--ink-faint)" }}
            >
              {active ? <EqBars active={player.isPlaying} height={11} bars={3} color="var(--accent)" /> : index + 1}
            </span>
            <Artwork
              src={track.artworkUrl}
              alt={track.title}
              size={40}
              radius={11}
              accent={track.accentColor}
            />
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-[13px] font-semibold"
                style={{ color: active ? "var(--accent)" : "var(--ink)" }}
              >
                {track.title}
              </span>
              <span
                className="block truncate text-[11.5px]"
                style={{ color: "var(--ink-mute)" }}
              >
                {track.artist}
              </span>
            </span>
            <span className="mono-num text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
              {formatTime(track.durationSeconds)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EqSheet({
  bands,
  preset,
  spatial,
  bass,
  onChange,
}: {
  bands: number[];
  preset: string;
  spatial: boolean;
  bass: number;
  onChange: (patch: {
    eqBands?: number[];
    eqPreset?: string;
    spatialEnabled?: boolean;
    bassBoost?: number;
  }) => void;
}) {
  return (
    <div className="pb-3">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {EQ_PRESETS.map((item) => (
          <Chip
            key={item.id}
            active={preset === item.id}
            onClick={() => onChange({ eqPreset: item.id, eqBands: item.bands })}
          >
            {item.name}
          </Chip>
        ))}
      </div>

      <div className="lg lg-flat mt-3 p-4" style={{ borderRadius: 22 }}>
        <div className="flex items-end justify-between gap-1">
          {bands.map((value, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className="mono-num text-[9.5px]"
                style={{ color: "var(--ink-faint)" }}
              >
                {value > 0 ? `+${value}` : value}
              </span>
              <input
                type="range"
                className="eq-slider"
                min={-12}
                max={12}
                step={1}
                value={value}
                aria-label={`${EQ_LABELS[index]} hertz`}
                onChange={(event) => {
                  const next = [...bands];
                  next[index] = Number(event.target.value);
                  onChange({ eqBands: next, eqPreset: "custom" });
                }}
                style={{
                  background: "transparent",
                  accentColor: "var(--accent)",
                }}
              />
              <span
                className="text-[9.5px] font-semibold"
                style={{ color: "var(--ink-mute)" }}
              >
                {EQ_LABELS[index]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="lg lg-flat mt-3 flex items-center justify-between px-4 py-3" style={{ borderRadius: 20 }}>
        <div>
          <p className="text-[13px] font-semibold">Spatial audio</p>
          <p className="text-[11px]" style={{ color: "var(--ink-mute)" }}>
            Haas widener and air shelf
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={spatial}
          aria-label="Spatial audio"
          onClick={() => onChange({ spatialEnabled: !spatial })}
          className="press relative h-7 w-12 rounded-full transition-colors"
          style={{ background: spatial ? "var(--accent)" : "rgba(120,120,130,.3)" }}
        >
          <span
            className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
            style={{ left: spatial ? 22 : 2 }}
          />
        </button>
      </div>

      <div className="lg lg-flat mt-3 px-4 py-3" style={{ borderRadius: 20 }}>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold">Bass boost</p>
          <span className="mono-num text-[11px]" style={{ color: "var(--ink-mute)" }}>
            {bass}%
          </span>
        </div>
        <input
          type="range"
          className="lg-range mt-1"
          min={0}
          max={100}
          step={1}
          value={bass}
          aria-label="Bass boost"
          onChange={(event) => onChange({ bassBoost: Number(event.target.value) })}
          style={{ ["--pct" as string]: `${bass}%` }}
        />
      </div>

      <p
        className="mt-3 flex items-center gap-1.5 px-1 text-[11px]"
        style={{ color: "var(--ink-faint)" }}
      >
        <Sparkles size={11} />
        Applied live through Web Audio. Changes are saved on this device.
      </p>
    </div>
  );
}
