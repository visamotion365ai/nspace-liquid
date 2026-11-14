"use client";

import React, { useRef, useState } from "react";
import {
  ChevronDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { PlayerApi } from "@/types/player";
import type { Settings, Track } from "@/types/music";
import { formatTime } from "@/lib/format";
import { Artwork, EqBars, IconButton } from "./ui";

function Scrubber({ player, compact = false }: { player: PlayerApi; compact?: boolean }) {
  const { progress, duration, seek } = player;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  return (
    <div className="w-full">
      <input
        type="range"
        className="lg-range"
        min={0}
        max={Math.max(1, duration)}
        step={0.5}
        value={Math.min(progress, duration || 1)}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Seek"
        style={{ ["--pct" as string]: `${pct}%` }}
      />
      <div
        className={`mono-num flex justify-between ${compact ? "mt-0.5 text-[10.5px]" : "mt-1 text-[11px]"}`}
        style={{ color: "var(--ink-faint)" }}
      >
        <span>{formatTime(progress)}</span>
        <span>-{formatTime(Math.max(0, duration - progress))}</span>
      </div>
    </div>
  );
}

function Transport({ player, size = "md" }: { player: PlayerApi; size?: "md" | "lg" }) {
  const big = size === "lg";
  const main = big ? 62 : 54;
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <button
        type="button"
        onClick={player.toggleShuffle}
        aria-label="Shuffle"
        aria-pressed={player.shuffle}
        className="press grid h-9 w-9 place-items-center rounded-full"
        style={{ color: player.shuffle ? "var(--accent)" : "var(--ink-mute)" }}
      >
        <Shuffle size={16} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        onClick={player.prev}
        aria-label="Previous"
        className="press grid h-11 w-11 place-items-center rounded-full"
        style={{ color: "var(--ink-soft)" }}
      >
        <SkipBack size={26} strokeWidth={2.1} fill="currentColor" />
      </button>
      <button
        type="button"
        onClick={player.toggle}
        aria-label={player.isPlaying ? "Pause" : "Play"}
        className="press grid place-items-center rounded-full text-white"
        style={{
          width: main,
          height: main,
          background: "var(--accent)",
          boxShadow:
            "0 18px 38px -16px var(--accent), inset 0 1px 0 rgba(255,255,255,.45)",
        }}
      >
        {player.isPlaying ? (
          <Pause size={big ? 28 : 25} strokeWidth={2.5} fill="currentColor" />
        ) : (
          <Play
            size={big ? 28 : 25}
            strokeWidth={2.5}
            fill="currentColor"
            className="ml-[2px]"
          />
        )}
      </button>
      <button
        type="button"
        onClick={player.next}
        aria-label="Next"
        className="press grid h-11 w-11 place-items-center rounded-full"
        style={{ color: "var(--ink-soft)" }}
      >
        <SkipForward size={26} strokeWidth={2.1} fill="currentColor" />
      </button>
      <button
        type="button"
        onClick={player.toggleRepeat}
        aria-label="Repeat"
        aria-pressed={player.repeat}
        className="press grid h-9 w-9 place-items-center rounded-full"
        style={{ color: player.repeat ? "var(--accent)" : "var(--ink-mute)" }}
      >
        {player.repeat ? (
          <Repeat1 size={16} strokeWidth={2.2} />
        ) : (
          <Repeat size={16} strokeWidth={2.2} />
        )}
      </button>
    </div>
  );
}

function ActionRow({
  player,
  onEq,
  onQueue,
  onAddToPlaylist,
}: {
  player: PlayerApi;
  onEq: () => void;
  onQueue: () => void;
  onAddToPlaylist?: (track: Track) => void;
}) {
  const track = player.current;
  if (!track) return null;
  return (
    <div className="flex items-center justify-between gap-1">
      <IconButton
        label="Like"
        active={player.isLiked(track.id)}
        onClick={() => player.like(track)}
      >
        <Heart
          size={16}
          fill={player.isLiked(track.id) ? "currentColor" : "none"}
        />
      </IconButton>
      <IconButton label="Add to playlist" onClick={() => onAddToPlaylist?.(track)}>
        <Plus size={17} />
      </IconButton>
      <IconButton label="Save offline" onClick={() => player.download(track)}>
        <span className="text-[11px] font-bold">↓</span>
      </IconButton>
      <IconButton label="Equaliser" onClick={onEq}>
        <SlidersHorizontal size={16} />
      </IconButton>
      <IconButton label="Queue" onClick={onQueue}>
        <ListMusic size={16} />
      </IconButton>
    </div>
  );
}

function VolumeRow({ player }: { player: PlayerApi }) {
  const Icon = player.volume === 0 ? VolumeX : player.volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => player.setVolume(player.volume === 0 ? 0.8 : 0)}
        aria-label="Mute"
        style={{ color: "var(--ink-mute)" }}
        className="press"
      >
        <Icon size={15} />
      </button>
      <input
        type="range"
        className="lg-range"
        min={0}
        max={1}
        step={0.01}
        value={player.volume}
        onChange={(event) => player.setVolume(Number(event.target.value))}
        aria-label="Volume"
        style={{ ["--pct" as string]: `${player.volume * 100}%` }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- panel */

export function NowPlayingPanel({
  player,
  settings,
}: {
  player: PlayerApi;
  settings: Settings;
}) {
  const track = player.current;
  const [tab, setTab] = useState<"player" | "queue">("player");
  const isPreview =
    player.duration > 0 && player.duration < 32 && (track?.durationSeconds || 0) > 45;

  return (
    <div className="lg lg-panel flex h-full flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{tab === "player" ? "Now playing" : "Up next"}</p>
        <div
          className="flex gap-1 rounded-full p-0.5"
          style={{ background: "color-mix(in srgb, var(--ink) 6%, transparent)" }}
        >
          {(["player", "queue"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="press rounded-full px-2.5 py-1 text-[10.5px] font-semibold capitalize"
              style={{
                background: tab === id ? "var(--paper-3)" : "transparent",
                color: tab === id ? "var(--ink)" : "var(--ink-mute)",
                boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,.12)" : "none",
              }}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      {!track ? (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
          <div
            className="grid h-28 w-28 place-items-center rounded-[28px]"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(255,255,255,.85), rgba(255,255,255,.25))",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)",
            }}
          >
            <EqBars active={false} height={26} bars={5} color="var(--ink-faint)" />
          </div>
          <p className="mt-4 text-[13px] font-semibold">Nothing playing</p>
          <p className="mt-1 max-w-[220px] text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
            Pick a live mix from Listen, or ask the AI DJ for something specific.
          </p>
        </div>
      ) : tab === "queue" ? (
        <div className="scroll-area mt-3 -mr-1 flex-1 pr-1">
          {player.queue.map((item, index) => {
            const active = item.id === track.id;
            return (
              <button
                key={`${item.id}-${index}`}
                type="button"
                onClick={() => player.play(item, player.queue)}
                className="press flex w-full items-center gap-2.5 rounded-xl px-1.5 py-2 text-left"
                style={{
                  background: active
                    ? "color-mix(in srgb, var(--accent) 9%, transparent)"
                    : "transparent",
                }}
              >
                <Artwork
                  src={item.artworkUrl}
                  alt={item.title}
                  size={36}
                  radius={10}
                  accent={item.accentColor}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[12.5px] font-semibold"
                    style={{ color: active ? "var(--accent)" : "var(--ink)" }}
                  >
                    {item.title}
                  </span>
                  <span
                    className="block truncate text-[11px]"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    {item.artist}
                  </span>
                </span>
                <span className="mono-num text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
                  {formatTime(item.durationSeconds)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="relative mt-4">
            <div
              className="art-glow"
              style={{ background: track.accentColor, opacity: 0.4 }}
            />
            <div className="relative mx-auto w-full max-w-[248px]">
              <Artwork
                src={track.artworkUrl}
                alt={track.title}
                size={248}
                radius={26}
                accent={track.accentColor}
                glow
                className="w-full"
              />
              <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-white/30" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold tracking-[-0.02em]">
                  {track.title}
                </p>
                <p className="truncate text-[12.5px]" style={{ color: "var(--ink-mute)" }}>
                  {track.artist}
                </p>
              </div>
              <span
                className="lg lg-flat lg-round shrink-0 px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide"
                style={{ color: "var(--ink-mute)" }}
              >
                {isPreview ? "Preview" : settings.quality === "hi-res" ? "Hi-Res" : settings.quality}
              </span>
            </div>

            <div className="mt-3">
              <Scrubber player={player} />
            </div>

            <div className="mt-3">
              <Transport player={player} />
            </div>

            <div className="mt-3">
              <VolumeRow player={player} />
            </div>

            <div className="mt-3">
              <ActionRow
                player={player}
                onEq={player.openEq}
                onQueue={player.openQueue}
                onAddToPlaylist={player.openTrackMenu}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- sheet */

export function NowPlayingSheet({
  open,
  onClose,
  player,
  settings,
  onOpenEq,
  onOpenQueue,
  onOpenPlaylist,
}: {
  open: boolean;
  onClose: () => void;
  player: PlayerApi;
  settings: Settings;
  onOpenEq: () => void;
  onOpenQueue: () => void;
  onOpenPlaylist: (track: Track) => void;
}) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  if (!open) return null;
  const track = player.current;
  if (!track) return null;
  const isPreview =
    player.duration > 0 && player.duration < 32 && (track.durationSeconds || 0) > 45;

  const onTouchStart = (event: React.TouchEvent) => {
    startY.current = event.touches[0].clientY;
  };
  const onTouchMove = (event: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = event.touches[0].clientY - startY.current;
    if (delta > 0) setDragY(delta);
  };
  const onTouchEnd = () => {
    if (dragY > 120) onClose();
    setDragY(0);
    startY.current = null;
  };

  return (
    <div className="fixed inset-0 z-[60] xl:hidden">
      <div
        className="anim-fade absolute inset-0"
        style={{
          background: "rgba(10,10,14,.34)",
          backdropFilter: "blur(14px) saturate(140%)",
        }}
        onClick={onClose}
      />
      <div
        className="anim-sheet lg lg-strong lg-sheet absolute inset-x-0 bottom-0 flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragY ? "none" : "transform .4s cubic-bezier(.22,1.18,.36,1)",
          maxHeight: "96dvh",
          borderRadius: "34px 34px 0 0",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between px-5 pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close player"
            className="press grid h-9 w-9 place-items-center rounded-full"
            style={{ color: "var(--ink-mute)" }}
          >
            <ChevronDown size={20} />
          </button>
          <div className="flex flex-col items-center">
            <span
              className="h-1 w-9 rounded-full"
              style={{ background: "rgba(120,120,130,.35)" }}
            />
            <p className="eyebrow mt-2">Playing from {track.album || "N Space"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press grid h-9 w-9 place-items-center rounded-full"
            style={{ color: "var(--ink-mute)" }}
          >
            <X size={17} />
          </button>
        </div>

        <div className="scroll-area flex-1 overflow-y-auto px-5 pb-6">
          <div className="relative mx-auto mt-5 w-full max-w-[330px]">
            <div className="art-glow" style={{ background: track.accentColor, opacity: 0.4 }} />
            <Artwork
              src={track.artworkUrl}
              alt={track.title}
              size={330}
              radius={28}
              accent={track.accentColor}
              glow
              className="w-full"
            />
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/25" />
          </div>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="display truncate text-[27px] leading-tight">{track.title}</p>
              <p className="truncate text-[13.5px]" style={{ color: "var(--ink-mute)" }}>
                {track.artist}
              </p>
            </div>
            <span
              className="lg lg-flat lg-round mt-1 shrink-0 px-2.5 py-1 text-[9.5px] font-bold uppercase"
              style={{ color: "var(--ink-mute)" }}
            >
              {isPreview
                ? "Official 30s preview"
                : track.sourceType === "youtube"
                  ? "Live stream"
                  : "Preview"}
            </span>
          </div>

          <div className="mt-4">
            <Scrubber player={player} />
          </div>
          <div className="mt-3">
            <Transport player={player} size="lg" />
          </div>
          <div className="mt-4">
            <VolumeRow player={player} />
          </div>
          <div className="mt-4">
            <ActionRow
              player={player}
              onEq={onOpenEq}
              onQueue={onOpenQueue}
              onAddToPlaylist={onOpenPlaylist}
            />
          </div>

          <div className="lg lg-flat mt-5 p-3" style={{ borderRadius: 20 }}>
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold">Sound profile</p>
              <span className="text-[11px]" style={{ color: "var(--ink-mute)" }}>
                {settings.spatialEnabled ? "Spatial on" : "Spatial off"} ·{" "}
                {settings.eqPreset.replace("-", " ")}
              </span>
            </div>
            <div className="mt-2 flex items-end gap-[3px]" aria-hidden>
              {settings.eqBands.map((band, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-full"
                  style={{
                    height: `${Math.max(4, ((band + 12) / 24) * 34)}px`,
                    background:
                      band > 0
                        ? "var(--accent)"
                        : "color-mix(in srgb, var(--ink) 22%, transparent)",
                    opacity: band > 0 ? 0.9 : 0.6,
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenQueue}
            className="press mt-4 flex w-full items-center justify-between rounded-2xl px-1 py-2"
          >
            <span className="text-[12.5px] font-semibold">
              Next up · {player.queue.length} in queue
            </span>
            <ListMusic size={15} style={{ color: "var(--ink-mute)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
