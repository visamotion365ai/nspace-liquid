"use client";

import { useSyncExternalStore } from "react";
import type { AgentTurn, Playlist, Settings, Track } from "@/types/music";
import { accentFromString, uid } from "./format";

const STORAGE_KEY = "nspace.liquid.v1";

export interface LibrarySnapshot {
  tracks: Track[];
  likedIds: string[];
  playlists: Playlist[];
  recentIds: string[];
  turns: AgentTurn[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  eqPreset: "apple-signature",
  eqBands: [3, 2, 1, 0, 1, 2, 3, 4, 3, 2],
  spatialEnabled: true,
  bassBoost: 35,
  quality: "hi-res",
  provider: "base44",
  hasApiKey: false,
  crossfade: true,
  autoplay: true,
};

const EMPTY: LibrarySnapshot = {
  tracks: [],
  likedIds: [],
  playlists: [],
  recentIds: [],
  turns: [],
  settings: DEFAULT_SETTINGS,
};

let snapshot: LibrarySnapshot = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function readStorage(): LibrarySnapshot {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY, settings: { ...DEFAULT_SETTINGS } };
    const parsed = JSON.parse(raw) as Partial<LibrarySnapshot>;
    return {
      tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
      likedIds: Array.isArray(parsed.likedIds) ? parsed.likedIds : [],
      playlists: Array.isArray(parsed.playlists) ? parsed.playlists : [],
      recentIds: Array.isArray(parsed.recentIds) ? parsed.recentIds : [],
      turns: Array.isArray(parsed.turns) ? parsed.turns : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return { ...EMPTY, settings: { ...DEFAULT_SETTINGS } };
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

function persist(next: LibrarySnapshot) {
  snapshot = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: keep the in-memory copy */
    }
  }
  emit();
  channel?.postMessage({ type: "sync", payload: next });
}

export function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  snapshot = readStorage();
  try {
    channel = new BroadcastChannel("nspace.liquid.sync");
    channel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === "sync" && event.data.payload) {
        snapshot = event.data.payload as LibrarySnapshot;
        emit();
      }
    };
  } catch {
    channel = null;
  }
  emit();
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSnapshot(): LibrarySnapshot {
  return snapshot;
}

export function useLibrary(): LibrarySnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

function update(mutate: (draft: LibrarySnapshot) => LibrarySnapshot) {
  persist(mutate(snapshot));
}

export function trackFromCandidate(
  candidate: {
    title: string;
    artist: string;
    album?: string;
    artworkUrl: string;
    audioUrl: string;
    youtubeUrl?: string;
    youtubeVideoId?: string;
    durationSeconds: number;
    explicit?: boolean;
    sourceType?: "youtube" | "itunes" | "local";
    audioQuality?: string;
  },
  accentSeed?: string
): Track {
  const seed = accentSeed || `${candidate.title}${candidate.artist}`;
  return {
    id: candidate.youtubeVideoId
      ? `yt_${candidate.youtubeVideoId}`
      : uid("trk"),
    title: candidate.title,
    artist: candidate.artist,
    album: candidate.album || "N Space",
    artworkUrl: candidate.artworkUrl,
    audioUrl: candidate.audioUrl,
    sourceType: candidate.sourceType || "youtube",
    youtubeUrl: candidate.youtubeUrl,
    youtubeVideoId: candidate.youtubeVideoId,
    durationSeconds: candidate.durationSeconds,
    explicit: Boolean(candidate.explicit),
    audioQuality: candidate.audioQuality || "Hi-Res • 256 kbps",
    accentColor: accentFromString(seed),
    addedAt: Date.now(),
  };
}

export function upsertTrack(track: Track): Track {
  update((draft) => {
    const existingIndex = draft.tracks.findIndex((t) => t.id === track.id);
    const tracks =
      existingIndex >= 0
        ? draft.tracks.map((t) => (t.id === track.id ? { ...t, ...track } : t))
        : [track, ...draft.tracks];
    return { ...draft, tracks };
  });
  return track;
}

export function toggleLike(track: Track) {
  const libraryTrack = upsertTrack(track);
  update((draft) => {
    const liked = draft.likedIds.includes(libraryTrack.id)
      ? draft.likedIds.filter((id) => id !== libraryTrack.id)
      : [libraryTrack.id, ...draft.likedIds];
    return { ...draft, likedIds: liked };
  });
}

export function isLiked(id: string): boolean {
  return snapshot.likedIds.includes(id);
}

export function pushRecent(id: string) {
  update((draft) => ({
    ...draft,
    recentIds: [id, ...draft.recentIds.filter((x) => x !== id)].slice(0, 30),
  }));
}

export function createPlaylist(name: string, description = ""): Playlist {
  const playlist: Playlist = {
    id: uid("pl"),
    name: name.trim() || "New Playlist",
    description,
    trackIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  update((draft) => ({ ...draft, playlists: [playlist, ...draft.playlists] }));
  return playlist;
}

export function addToPlaylist(playlistId: string, trackId: string) {
  update((draft) => ({
    ...draft,
    playlists: draft.playlists.map((p) =>
      p.id === playlistId && !p.trackIds.includes(trackId)
        ? { ...p, trackIds: [...p.trackIds, trackId], updatedAt: Date.now() }
        : p
    ),
  }));
}

export function removeFromPlaylist(playlistId: string, trackId: string) {
  update((draft) => ({
    ...draft,
    playlists: draft.playlists.map((p) =>
      p.id === playlistId
        ? {
            ...p,
            trackIds: p.trackIds.filter((id) => id !== trackId),
            updatedAt: Date.now(),
          }
        : p
    ),
  }));
}

export function deletePlaylist(playlistId: string) {
  update((draft) => ({
    ...draft,
    playlists: draft.playlists.filter((p) => p.id !== playlistId),
  }));
}

export function removeTrack(trackId: string) {
  update((draft) => ({
    ...draft,
    tracks: draft.tracks.filter((t) => t.id !== trackId),
    likedIds: draft.likedIds.filter((id) => id !== trackId),
    recentIds: draft.recentIds.filter((id) => id !== trackId),
    playlists: draft.playlists.map((p) => ({
      ...p,
      trackIds: p.trackIds.filter((id) => id !== trackId),
    })),
  }));
}

export function patchSettings(patch: Partial<Settings>) {
  update((draft) => ({ ...draft, settings: { ...draft.settings, ...patch } }));
}

export function addAgentTurn(turn: AgentTurn) {
  update((draft) => ({ ...draft, turns: [turn, ...draft.turns].slice(0, 40) }));
}

export function clearHistory() {
  update((draft) => ({ ...draft, turns: [], recentIds: [] }));
}

export function clearLibrary() {
  update((draft) => ({
    ...draft,
    tracks: [],
    likedIds: [],
    recentIds: [],
    playlists: [],
  }));
}

const API_KEY_STORAGE = "nspace.apikey";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    if (key) window.localStorage.setItem(API_KEY_STORAGE, key);
    else window.localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    /* ignore */
  }
  patchSettings({
    hasApiKey: Boolean(key),
    apiKeyMasked: key ? `${key.slice(0, 3)}••••${key.slice(-4)}` : undefined,
  });
}
