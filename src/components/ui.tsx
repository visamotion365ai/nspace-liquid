"use client";

import React from "react";
import { Check, MoreHorizontal, Pause, Play } from "lucide-react";
import type { Track } from "@/types/music";
import { formatTime } from "@/lib/format";

export function Artwork({
  src,
  alt,
  size = 56,
  radius = 14,
  accent,
  className = "",
  glow = false,
}: {
  src?: string;
  alt: string;
  size?: number;
  radius?: number;
  accent?: string;
  className?: string;
  glow?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    background: failed || !src
      ? `linear-gradient(145deg, ${accent || "#8e8e93"}, ${accent || "#48484a"}aa)`
      : undefined,
    boxShadow: glow
      ? `0 22px 50px -18px ${accent || "#000"}cc, 0 0 0 0.5px rgba(0,0,0,.08)`
      : "0 1px 2px rgba(0,0,0,.12)",
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={style}
      aria-label={alt}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span
            className="display"
            style={{ fontSize: size * 0.42, color: "rgba(255,255,255,.9)" }}
          >
            {alt.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.35)",
        }}
      />
    </div>
  );
}

export function EqBars({
  active,
  color = "currentColor",
  height = 14,
  bars = 5,
}: {
  active: boolean;
  color?: string;
  height?: number;
  bars?: number;
}) {
  return (
    <div
      className={`flex items-end gap-[2px] ${active ? "" : "eq-paused"}`}
      style={{ height, color }}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="eq-bar w-[2px]"
          style={{
            height: "100%",
            animationDelay: `${i * 0.11}s`,
            animationDuration: `${0.7 + (i % 3) * 0.16}s`,
            opacity: active ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  );
}

export function IconButton({
  label,
  children,
  onClick,
  active = false,
  size = 40,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`press tap-focus lg lg-flat lg-round grid place-items-center ${className}`}
      style={{
        width: size,
        height: size,
        color: active ? "var(--accent)" : "var(--ink-soft)",
        background: active
          ? "color-mix(in srgb, var(--accent) 14%, var(--glass-bg))"
          : undefined,
        borderRadius: 999,
      }}
    >
      {children}
    </button>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press tap-focus lg lg-flat lg-round shrink-0 px-4 py-2 text-[13px] font-semibold ${className}`}
      style={{
        color: active ? "#fff" : "var(--ink-soft)",
        background: active ? "var(--accent)" : undefined,
        boxShadow: active
          ? "0 8px 22px -10px var(--accent), inset 0 0 0 1px rgba(255,255,255,.28)"
          : undefined,
      }}
    >
      {children}
    </button>
  );
}

export function SectionHead({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="press text-[12px] font-semibold"
          style={{ color: "var(--accent)" }}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function PlayGlyph({
  playing,
  size = 18,
}: {
  playing: boolean;
  size?: number;
}) {
  return playing ? (
    <Pause size={size} strokeWidth={2.4} />
  ) : (
    <Play size={size} strokeWidth={2.4} className="ml-[1px]" />
  );
}

export function TrackRow({
  track,
  index,
  active,
  playing,
  onPlay,
  onMenu,
  liked,
}: {
  track: Track;
  index?: number;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
  onMenu?: (event: React.MouseEvent) => void;
  liked?: boolean;
}) {
  return (
    <div
      className="press group flex items-center gap-3 rounded-2xl px-2.5 py-2"
      style={{
        background: active
          ? "color-mix(in srgb, var(--accent) 9%, transparent)"
          : "transparent",
      }}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Play ${track.title}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {typeof index === "number" ? (
          <span
            className="mono-num w-4 shrink-0 text-center text-[12px] font-medium"
            style={{ color: active ? "var(--accent)" : "var(--ink-faint)" }}
          >
            {active && playing ? <EqBars active height={11} bars={3} /> : index + 1}
          </span>
        ) : null}
        <Artwork
          src={track.artworkUrl}
          alt={track.title}
          size={46}
          radius={12}
          accent={track.accentColor}
        />
        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-[14.5px] font-semibold leading-tight"
            style={{ color: active ? "var(--accent)" : "var(--ink)" }}
          >
            {track.title}
          </span>
          <span
            className="mt-0.5 block truncate text-[12.5px]"
            style={{ color: "var(--ink-mute)" }}
          >
            {track.artist}
            {track.explicit ? " · E" : ""}
          </span>
        </span>
      </button>
      {liked ? (
        <Check size={13} style={{ color: "var(--accent)" }} aria-hidden />
      ) : null}
      <span
        className="mono-num shrink-0 text-[12px]"
        style={{ color: "var(--ink-faint)" }}
      >
        {formatTime(track.durationSeconds)}
      </span>
      {onMenu ? (
        <button
          type="button"
          onClick={onMenu}
          aria-label="Track options"
          className="press grid h-8 w-8 place-items-center rounded-full"
          style={{ color: "var(--ink-mute)" }}
        >
          <MoreHorizontal size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({ height = 74, radius = 18 }: { height?: number; radius?: number }) {
  return (
    <div
      className="w-full animate-pulse"
      style={{
        height,
        borderRadius: radius,
        background:
          "linear-gradient(100deg, rgba(140,140,150,.12), rgba(140,140,150,.2), rgba(140,140,150,.12))",
      }}
    />
  );
}

export function Spinner({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <span
      className="spin inline-block rounded-full"
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        opacity: 0.9,
      }}
      aria-label="Loading"
    />
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}>
      <div className="lg lg-strong lg-round anim-pop max-w-[92vw] px-4 py-2.5 text-[13px] font-medium">
        {message}
      </div>
    </div>
  );
}
