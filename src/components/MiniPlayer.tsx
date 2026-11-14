"use client";

import React from "react";
import { SkipForward, Play, Pause } from "lucide-react";
import type { PlayerApi } from "@/types/player";
import { Artwork, EqBars } from "./ui";

export function MiniPlayer({
  player,
  onOpen,
}: {
  player: PlayerApi;
  onOpen: () => void;
}) {
  const { current, isPlaying, progress, duration } = player;
  if (!current) return null;
  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div
      className="fixed inset-x-0 z-40 flex justify-center px-3 xl:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
    >
      <div className="anim-pop w-full max-w-[430px] md:max-w-[560px]">
        <div className="lg lg-strong relative overflow-hidden p-2" style={{ borderRadius: 22 }}>
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: "rgba(120,120,130,.18)" }}
          >
            <div
              className="h-full transition-[width] duration-300 ease-linear"
              style={{ width: `${pct}%`, background: "var(--accent)" }}
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpen}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              aria-label="Open now playing"
            >
              <Artwork
                src={current.artworkUrl}
                alt={current.title}
                size={42}
                radius={12}
                accent={current.accentColor}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold">
                    {current.title}
                  </span>
                </span>
                <span
                  className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px]"
                  style={{ color: "var(--ink-mute)" }}
                >
                  <EqBars
                    active={isPlaying}
                    height={9}
                    bars={3}
                    color="var(--accent)"
                  />
                  <span className="truncate">{current.artist}</span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={player.toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="press grid h-9 w-9 place-items-center rounded-full text-white"
              style={{ background: "var(--accent)" }}
            >
              {isPlaying ? (
                <Pause size={16} strokeWidth={2.6} />
              ) : (
                <Play size={16} strokeWidth={2.6} className="ml-[1px]" />
              )}
            </button>
            <button
              type="button"
              onClick={player.next}
              aria-label="Next track"
              className="press grid h-9 w-9 place-items-center rounded-full"
              style={{ color: "var(--ink-soft)" }}
            >
              <SkipForward size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
