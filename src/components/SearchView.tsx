"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, Play, Search, X } from "lucide-react";
import type { SearchCandidate } from "@/types/music";
import type { Track } from "@/types/music";
import type { PlayerApi } from "@/types/player";
import { trackFromCandidate } from "@/lib/store";
import { formatTime } from "@/lib/format";
import { Artwork, Chip, EqBars, SectionHead, Skeleton, Spinner } from "./ui";

const SUGGESTIONS = [
  "Arijit Singh",
  "lofi study",
  "Bangla new song",
  "Taylor Swift",
  "workout mix",
  "night drive",
  "acoustic covers",
  "K-pop hits",
];

const KEY = "nspace.searches";

export function SearchView({ player }: { player: PlayerApi }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const remember = useCallback((term: string) => {
    setRecent((prev) => {
      const next = [term, ...prev.filter((item) => item !== term)].slice(0, 8);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const runSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const isLink = /youtube\.com|youtu\.be/.test(trimmed);
        if (isLink) {
          const res = await fetch("/api/agent/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: trimmed }),
            signal: controller.signal,
          });
          const data = await res.json();
          const single: SearchCandidate[] = data.track ? [data.track] : [];
          setResults(single);
          if (!single.length) setError(data.reply || "That link did not resolve.");
          remember(trimmed);
          return;
        }
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=14`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        if (!data.results?.length) setError(data.error || "No matches in the live catalogue.");
        remember(trimmed);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Search failed. Check your connection and try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [remember]
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const timer = window.setTimeout(() => void runSearch(trimmed), 420);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const tracks = useMemo(
    () => results.map((candidate) => trackFromCandidate(candidate)),
    [results]
  );

  return (
    <div className="anim-fade space-y-5 pb-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query);
        }}
        className="lg lg-strong flex items-center gap-2 px-3 py-2"
        style={{ borderRadius: 20 }}
      >
        <Search size={17} style={{ color: "var(--ink-mute)" }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Songs, artists, moods, or a YouTube link"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] outline-none"
          style={{ color: "var(--ink)" }}
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="search"
          aria-label="Search music"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            aria-label="Clear"
            className="press grid h-7 w-7 place-items-center rounded-full"
            style={{ color: "var(--ink-mute)" }}
          >
            <X size={14} />
          </button>
        ) : (
          <kbd
            className="hidden rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:block"
            style={{ background: "rgba(120,120,130,.14)", color: "var(--ink-mute)" }}
          >
            /
          </kbd>
        )}
      </form>

      {!query ? (
        <>
          {recent.length > 0 ? (
            <section>
              <SectionHead title="Recent searches" />
              <div className="flex flex-wrap gap-2">
                {recent.map((term) => (
                  <Chip key={term} onClick={() => setQuery(term)}>
                    {term}
                  </Chip>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionHead title="Try one of these" />
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((term) => (
                <Chip key={term} onClick={() => setQuery(term)}>
                  {term}
                </Chip>
              ))}
            </div>
          </section>

          <section className="lg lg-flat flex items-center gap-3 p-4" style={{ borderRadius: 22 }}>
            <span
              className="grid h-9 w-9 place-items-center rounded-full"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <Link2 size={15} />
            </span>
            <p className="text-[12px] leading-snug" style={{ color: "var(--ink-mute)" }}>
              Paste any YouTube link to pull just that audio, with the same player,
              EQ and offline vault.
            </p>
          </section>
        </>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height={58} radius={16} />
          ))}
          <div className="flex items-center justify-center gap-2 pt-1 text-[11px]" style={{ color: "var(--ink-faint)" }}>
            <Spinner size={11} /> Searching live
          </div>
        </div>
      ) : results.length ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold" style={{ color: "var(--ink-mute)" }}>
              {results.length} results · live
            </p>
            <button
              type="button"
              onClick={() => player.playAll(tracks, 0)}
              className="press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              <Play size={12} fill="currentColor" strokeWidth={0} />
              Play all
            </button>
          </div>
          <div className="space-y-1">
            {tracks.map((track: Track) => {
              const active = player.current?.id === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => player.play(track, tracks)}
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
                    size={46}
                    radius={12}
                    accent={track.accentColor}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[13.5px] font-semibold"
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
                  {active && player.isPlaying ? (
                    <EqBars active height={12} bars={3} color="var(--accent)" />
                  ) : (
                    <span className="mono-num text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
                      {formatTime(track.durationSeconds)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="lg lg-flat p-5 text-center" style={{ borderRadius: 22 }}>
          <p className="text-[13px] font-semibold">No live matches</p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--ink-mute)" }}>
            {error || "Try a looser phrase, an artist name, or a direct link."}
          </p>
        </div>
      )}
    </div>
  );
}
