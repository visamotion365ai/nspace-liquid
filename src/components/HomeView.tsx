"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Play, RefreshCw, Sparkles, Radio } from "lucide-react";
import type { LibraryState, SearchCandidate, TabId, Track } from "@/types/music";
import type { PlayerApi } from "@/types/player";
import { greeting, formatTime } from "@/lib/format";
import { trackFromCandidate } from "@/lib/store";
import { Artwork, Chip, EqBars, SectionHead, Skeleton, Spinner } from "./ui";

const MOODS = [
  { id: "for-you", label: "For You" },
  { id: "chill", label: "Chill" },
  { id: "focus", label: "Focus" },
  { id: "energy", label: "Energy" },
  { id: "bangla", label: "Bangla" },
  { id: "throwback", label: "Throwback" },
];

function toTrack(candidate: SearchCandidate): Track {
  return trackFromCandidate(candidate);
}

function LiveCard({
  track,
  active,
  playing,
  onPlay,
}: {
  track: Track;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="press lift group w-full text-left"
      aria-label={`Play ${track.title}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[22px]">
        <Artwork
          src={track.artworkUrl}
          alt={track.title}
          size={220}
          radius={22}
          accent={track.accentColor}
          className="!h-full !w-full"
        />
        <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/25" />
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2.5"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,.42), rgba(0,0,0,0))",
          }}
        >
          <span
            className="mono-num rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white/90"
            style={{ background: "rgba(255,255,255,.18)", backdropFilter: "blur(6px)" }}
          >
            {formatTime(track.durationSeconds)}
          </span>
          <span
            className="grid h-8 w-8 place-items-center rounded-full text-white transition-transform group-hover:scale-105"
            style={{ background: active ? "var(--accent)" : "rgba(255,255,255,.24)", backdropFilter: "blur(8px)" }}
          >
            {active && playing ? (
              <EqBars active height={11} bars={3} color="#fff" />
            ) : (
              <Play size={14} fill="currentColor" strokeWidth={0} className="ml-[1px]" />
            )}
          </span>
        </div>
      </div>
      <p className="mt-2 truncate text-[13.5px] font-semibold leading-tight">
        {track.title}
      </p>
      <p className="truncate text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
        {track.artist}
      </p>
    </button>
  );
}

export function HomeView({
  player,
  onTab,
  library,
}: {
  player: PlayerApi;
  onTab: (tab: TabId) => void;
  library: LibraryState;
}) {
  const [mood, setMood] = useState("for-you");
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const load = useCallback(async (moodId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trending?mood=${encodeURIComponent(moodId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const results: SearchCandidate[] = Array.isArray(data.results) ? data.results : [];
      setCandidates(results);
      setUpdatedAt(Date.now());
      if (!results.length) setError(data.error || "Nothing live right now. Pull to refresh.");
    } catch {
      setError("Live feed unreachable. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(mood);
  }, [mood, load]);

  const tracks = useMemo(() => candidates.map(toTrack), [candidates]);
  const hero = tracks[0];
  const recent = useMemo(
    () =>
      library.recentIds
        .map((id) => library.tracks.find((t) => t.id === id))
        .filter((t): t is Track => Boolean(t))
        .slice(0, 5),
    [library.recentIds, library.tracks]
  );

  return (
    <div className="anim-fade space-y-6 pb-2">
      {/* hero */}
      <section className="lg lg-panel relative overflow-hidden p-4 sm:p-5">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{ background: hero?.accentColor || "var(--accent)" }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-1.5">
              <Radio size={11} />
              Live catalogue
            </p>
            <h2 className="display mt-2 text-[30px] leading-[0.95] sm:text-[38px]">
              {greeting()},
              <br />
              <em>listen now</em>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void load(mood)}
            aria-label="Refresh live feed"
            className="press lg lg-flat lg-round grid h-9 w-9 shrink-0 place-items-center"
            style={{ color: "var(--ink-mute)" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
        </div>

        <div className="relative mt-4 flex items-center gap-3">
          {hero ? (
            <>
              <button
                type="button"
                onClick={() => player.play(hero, tracks)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Artwork
                  src={hero.artworkUrl}
                  alt={hero.title}
                  size={64}
                  radius={18}
                  accent={hero.accentColor}
                  glow
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">
                    {hero.title}
                  </span>
                  <span
                    className="mt-0.5 block truncate text-[12px]"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    {hero.artist} · {tracks.length} live results
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => player.playAll(tracks, 0)}
                className="press flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white"
                style={{
                  background: "var(--accent)",
                  boxShadow: "0 14px 30px -14px var(--accent)",
                }}
              >
                <Play size={13} fill="currentColor" strokeWidth={0} />
                Play
              </button>
            </>
          ) : loading ? (
            <div className="flex w-full items-center gap-3">
              <Skeleton height={64} radius={18} />
            </div>
          ) : (
            <p className="text-[12.5px]" style={{ color: "var(--ink-mute)" }}>
              {error || "Nothing to show yet."}
            </p>
          )}
        </div>
      </section>

      {/* moods */}
      <section>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {MOODS.map((item) => (
            <Chip
              key={item.id}
              active={mood === item.id}
              onClick={() => setMood(item.id)}
            >
              {item.label}
            </Chip>
          ))}
        </div>
      </section>

      {/* trending */}
      <section>
        <SectionHead
          title="Trending live"
          action={updatedAt ? "Updated just now" : undefined}
        />
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton height={150} radius={22} />
                <Skeleton height={12} radius={6} />
              </div>
            ))}
          </div>
        ) : error && !tracks.length ? (
          <div className="lg lg-flat flex items-center gap-3 p-4" style={{ borderRadius: 20 }}>
            <span style={{ color: "var(--accent)" }}>
              <Sparkles size={16} />
            </span>
            <p className="flex-1 text-[12.5px]" style={{ color: "var(--ink-mute)" }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => void load(mood)}
              className="press rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
            {tracks.slice(0, 8).map((track) => (
              <LiveCard
                key={track.id}
                track={track}
                active={player.current?.id === track.id}
                playing={player.isPlaying}
                onPlay={() => player.play(track, tracks)}
              />
            ))}
          </div>
        )}
      </section>

      {/* recent */}
      {recent.length > 0 ? (
        <section>
          <SectionHead
            title="Recently played"
            action="Library"
            onAction={() => onTab("library")}
          />
          <div className="lg lg-flat divide-y p-1.5" style={{ borderRadius: 22, borderColor: "transparent" }}>
            {recent.map((track, index) => {
              const active = player.current?.id === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => player.play(track, recent)}
                  className="press flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left"
                  style={{
                    background: active
                      ? "color-mix(in srgb, var(--accent) 9%, transparent)"
                      : "transparent",
                  }}
                >
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
                  <span
                    className="mono-num text-[10.5px]"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {index + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* shortcuts */}
      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onTab("agent")}
          className="press lg lg-tint flex items-center justify-between p-4 text-left"
          style={{ borderRadius: 24 }}
        >
          <span>
            <span className="eyebrow">AI DJ</span>
            <span className="mt-1 block text-[15px] font-semibold">
              Ask for any mood
            </span>
            <span className="mt-0.5 block text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
              Real catalogue, natural language
            </span>
          </span>
          <ArrowUpRight size={18} style={{ color: "var(--accent)" }} />
        </button>
        <button
          type="button"
          onClick={() => onTab("library")}
          className="press lg flex items-center justify-between p-4 text-left"
          style={{ borderRadius: 24 }}
        >
          <span>
            <span className="eyebrow">Offline</span>
            <span className="mt-1 block text-[15px] font-semibold">
              Device vault
            </span>
            <span className="mt-0.5 block text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
              Plays with no signal
            </span>
          </span>
          <ArrowUpRight size={18} style={{ color: "var(--ink-mute)" }} />
        </button>
      </section>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-1 text-[11px]" style={{ color: "var(--ink-faint)" }}>
          <Spinner size={11} />
          Reading the live catalogue
        </div>
      ) : null}
    </div>
  );
}
