"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Play, Sparkles, Wand2 } from "lucide-react";
import type { SearchCandidate, Settings } from "@/types/music";
import type { PlayerApi } from "@/types/player";
import { addAgentTurn, getApiKey, trackFromCandidate } from "@/lib/store";
import { formatTime, uid } from "@/lib/format";
import { Artwork, Chip, Spinner } from "./ui";

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  track?: SearchCandidate | null;
  pending?: boolean;
}

const STARTERS = [
  "Something for a rainy Dhaka evening",
  "Bangla road trip, but modern",
  "Arijit Singh deep cuts",
  "Deep focus for the next two hours",
  "Workout energy, no slow songs",
  "Late night r&b",
];

export function AgentView({
  player,
  settings,
}: {
  player: PlayerApi;
  settings: Settings;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "seed",
      role: "agent",
      text: "I'm your DJ. Describe a mood, an artist, or paste a link. I search the live catalogue and play it here.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (raw: string) => {
    const prompt = raw.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    const userMsg: Message = { id: uid("u"), role: "user", text: prompt };
    const pendingId = uid("a");
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: pendingId, role: "agent", text: "", pending: true },
    ]);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: settings.provider,
          apiKey: getApiKey(),
        }),
      });
      const data = await res.json();
      const reply: string =
        data.reply ||
        (data.track
          ? `Found ${data.track.title}.`
          : "I couldn't find that one. Try a different phrase.");
      const track: SearchCandidate | null = data.track || null;

      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? { ...message, text: reply, track, pending: false }
            : message
        )
      );

      addAgentTurn({
        id: uid("turn"),
        prompt,
        reply,
        trackId: track?.youtubeVideoId,
        createdAt: Date.now(),
      });
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                text: "Connection dropped. Try that again.",
                pending: false,
              }
            : message
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const suggestions = useMemo(() => STARTERS.slice(0, 4), []);

  return (
    <div className="anim-fade flex min-h-[calc(100dvh-260px)] flex-col pb-2">
      <div
        className="lg lg-panel relative mb-3 overflow-hidden p-4"
        style={{ borderRadius: 24 }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--accent)" }}
        />
        <div className="relative flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl"
            style={{
              background:
                "linear-gradient(150deg, color-mix(in srgb, var(--accent) 55%, white), var(--accent))",
              color: "#fff",
              boxShadow: "0 12px 26px -14px var(--accent)",
            }}
          >
            <Sparkles size={18} />
          </span>
          <div className="min-w-0">
            <p className="display text-[24px] leading-none">AI DJ</p>
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
              {settings.hasApiKey
                ? "Language model connected"
                : "Local intent mode · works with no key"}
            </p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="scroll-area min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.map((message) => {
          const track = message.track ? trackFromCandidate(message.track) : null;
          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div
                  className="max-w-[85%] rounded-[20px] rounded-br-[6px] px-3.5 py-2.5 text-[13.5px] font-medium text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {message.text}
                </div>
              </div>
            );
          }
          return (
            <div key={message.id} className="flex justify-start">
              <div className="lg lg-flat max-w-[92%] px-3.5 py-3" style={{ borderRadius: 20 }}>
                {message.pending ? (
                  <span className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--ink-mute)" }}>
                    <Spinner size={12} /> Searching the live catalogue
                  </span>
                ) : (
                  <p className="text-[13px] leading-relaxed">{message.text}</p>
                )}

                {track ? (
                  <div className="mt-2.5 flex items-center gap-2.5 rounded-2xl p-2"
                    style={{ background: "color-mix(in srgb, var(--ink) 6%, transparent)" }}>
                    <Artwork
                      src={track.artworkUrl}
                      alt={track.title}
                      size={44}
                      radius={12}
                      accent={track.accentColor}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">{track.title}</p>
                      <p className="truncate text-[11px]" style={{ color: "var(--ink-mute)" }}>
                        {track.artist} · {formatTime(track.durationSeconds)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => player.play(track, [track])}
                      className="press grid h-9 w-9 place-items-center rounded-full text-white"
                      style={{ background: "var(--accent)" }}
                      aria-label={`Play ${track.title}`}
                    >
                      <Play size={14} fill="currentColor" strokeWidth={0} className="ml-[1px]" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-2">
        {suggestions.map((starter) => (
          <Chip key={starter} onClick={() => void send(starter)}>
            {starter}
          </Chip>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="lg lg-strong mt-1 flex items-end gap-2 px-2 py-2"
        style={{ borderRadius: 24 }}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Ask for a mood, artist, or paste a link"
          className="max-h-24 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-[13.5px] outline-none"
          style={{ color: "var(--ink)" }}
          aria-label="Message the AI DJ"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-full text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {busy ? <Wand2 size={15} className="spin" /> : <ArrowUp size={16} strokeWidth={2.6} />}
        </button>
      </form>
    </div>
  );
}
