"use client";

import React, { useMemo, useState } from "react";
import { Download, HardDrive, Heart, ListMusic, Play, Plus, Trash2 } from "lucide-react";
import type { LibraryState, Playlist, Track } from "@/types/music";
import type { PlayerApi } from "@/types/player";
import {
  addToPlaylist,
  createPlaylist,
  deletePlaylist,
  removeTrack,
} from "@/lib/store";
import { removeFromVault } from "@/lib/vault";
import { formatBytes, formatTime } from "@/lib/format";
import { Artwork, Chip, EqBars, SectionHead, TrackRow } from "./ui";

type Segment = "liked" | "playlists" | "offline";

export function LibraryView({
  player,
  library,
  vault,
  onOpenPlaylist,
}: {
  player: PlayerApi;
  library: LibraryState;
  vault: { trackId: string; sizeBytes: number }[];
  onOpenPlaylist: (track: Track) => void;
}) {
  const [segment, setSegment] = useState<Segment>("liked");
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const liked = useMemo(
    () =>
      library.likedIds
        .map((id) => library.tracks.find((track) => track.id === id))
        .filter((track): track is Track => Boolean(track)),
    [library.likedIds, library.tracks]
  );

  const offline = useMemo(
    () =>
      vault
        .map((entry) => ({
          entry,
          track: library.tracks.find((track) => track.id === entry.trackId),
        }))
        .filter((row): row is { entry: { trackId: string; sizeBytes: number }; track: Track } =>
          Boolean(row.track)
        ),
    [vault, library.tracks]
  );

  const totalBytes = useMemo(
    () => vault.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    [vault]
  );

  const activePlaylist = library.playlists.find((item) => item.id === openPlaylistId) || null;
  const playlistTracks = activePlaylist
    ? activePlaylist.trackIds
        .map((id) => library.tracks.find((track) => track.id === id))
        .filter((track): track is Track => Boolean(track))
    : [];

  return (
    <div className="anim-fade space-y-5 pb-2">
      <div
        className="flex gap-1 rounded-2xl p-1"
        style={{ background: "color-mix(in srgb, var(--ink) 6%, transparent)" }}
      >
        {(
          [
            { id: "liked", label: `Liked · ${liked.length}` },
            { id: "playlists", label: `Playlists · ${library.playlists.length}` },
            { id: "offline", label: `Offline · ${offline.length}` },
          ] as { id: Segment; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSegment(item.id);
              setOpenPlaylistId(null);
            }}
            className="press flex-1 rounded-xl px-2 py-2 text-[11.5px] font-semibold"
            style={{
              background: segment === item.id ? "var(--paper-3)" : "transparent",
              color: segment === item.id ? "var(--ink)" : "var(--ink-mute)",
              boxShadow:
                segment === item.id ? "0 1px 5px rgba(0,0,0,.14)" : "none",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {segment === "liked" ? (
        liked.length ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-semibold" style={{ color: "var(--ink-mute)" }}>
                {liked.length} saved tracks
              </p>
              <button
                type="button"
                onClick={() => player.playAll(liked, 0)}
                className="press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
                style={{ background: "var(--accent)" }}
              >
                <Play size={12} fill="currentColor" strokeWidth={0} /> Play
              </button>
            </div>
            <div className="space-y-0.5">
              {liked.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  active={player.current?.id === track.id}
                  playing={player.isPlaying}
                  onPlay={() => player.play(track, liked)}
                  onMenu={() => player.openTrackMenu(track)}
                />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState
            icon={<Heart size={18} />}
            title="No liked songs yet"
            body="Tap the heart on any track and it lands here, ready offline."
          />
        )
      ) : null}

      {segment === "playlists" ? (
        activePlaylist ? (
          <section>
            <button
              type="button"
              onClick={() => setOpenPlaylistId(null)}
              className="press mb-2 text-[12px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              ← All playlists
            </button>
            <div className="lg lg-flat mb-3 flex items-center gap-3 p-3" style={{ borderRadius: 22 }}>
              <div
                className="grid h-14 w-14 place-items-center rounded-2xl"
                style={{
                  background:
                    "linear-gradient(145deg, color-mix(in srgb, var(--accent) 34%, transparent), color-mix(in srgb, var(--accent) 12%, transparent))",
                  color: "var(--accent)",
                }}
              >
                <ListMusic size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{activePlaylist.name}</p>
                <p className="text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
                  {playlistTracks.length} tracks
                </p>
              </div>
              <button
                type="button"
                onClick={() => playlistTracks.length && player.playAll(playlistTracks, 0)}
                className="press grid h-10 w-10 place-items-center rounded-full text-white"
                style={{ background: "var(--accent)" }}
                aria-label="Play playlist"
              >
                <Play size={15} fill="currentColor" strokeWidth={0} className="ml-[1px]" />
              </button>
            </div>
            {playlistTracks.length ? (
              <div className="space-y-0.5">
                {playlistTracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index}
                    active={player.current?.id === track.id}
                    playing={player.isPlaying}
                    onPlay={() => player.play(track, playlistTracks)}
                    onMenu={() => player.openTrackMenu(track)}
                  />
                ))}
              </div>
            ) : (
              <p className="px-1 py-6 text-center text-[12.5px]" style={{ color: "var(--ink-mute)" }}>
                Empty playlist. Add tracks from any track menu.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                deletePlaylist(activePlaylist.id);
                setOpenPlaylistId(null);
              }}
              className="press mt-4 flex items-center gap-1.5 text-[12px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              <Trash2 size={13} /> Delete playlist
            </button>
          </section>
        ) : (
          <section className="space-y-3">
            {adding ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!newName.trim()) return;
                  createPlaylist(newName.trim());
                  setNewName("");
                  setAdding(false);
                }}
                className="lg lg-flat flex gap-2 p-2"
                style={{ borderRadius: 20 }}
              >
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Playlist name"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent px-2 text-[13.5px] outline-none"
                />
                <button
                  type="submit"
                  className="press rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  Create
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="press lg lg-flat flex w-full items-center gap-2 px-4 py-3 text-[13px] font-semibold"
                style={{ borderRadius: 20, color: "var(--accent)" }}
              >
                <Plus size={15} /> New playlist
              </button>
            )}

            {library.playlists.length ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {library.playlists.map((playlist: Playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => setOpenPlaylistId(playlist.id)}
                    className="press lg flex items-center gap-3 p-3 text-left"
                    style={{ borderRadius: 22 }}
                  >
                    <div
                      className="grid h-12 w-12 place-items-center rounded-2xl"
                      style={{
                        background:
                          "linear-gradient(145deg, color-mix(in srgb, var(--accent) 34%, transparent), color-mix(in srgb, var(--accent) 10%, transparent))",
                        color: "var(--accent)",
                      }}
                    >
                      <ListMusic size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">{playlist.name}</p>
                      <p className="text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
                        {playlist.trackIds.length} tracks
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ListMusic size={18} />}
                title="No playlists yet"
                body="Make one for a client, a mood, or a long drive."
              />
            )}
          </section>
        )
      ) : null}

      {segment === "offline" ? (
        <section className="space-y-3">
          <div className="lg lg-flat flex items-center gap-3 p-4" style={{ borderRadius: 22 }}>
            <span
              className="grid h-10 w-10 place-items-center rounded-full"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <HardDrive size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">
                {offline.length} tracks · {formatBytes(totalBytes)}
              </p>
              <p className="text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
                Stored in this device only. Works with no signal.
              </p>
            </div>
          </div>

          {offline.length ? (
            <div className="space-y-1">
              {offline.map(({ entry, track }) => {
                const active = player.current?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className="press flex items-center gap-3 rounded-2xl px-2 py-2"
                    style={{
                      background: active
                        ? "color-mix(in srgb, var(--accent) 9%, transparent)"
                        : "transparent",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => player.play(track, offline.map((row) => row.track))}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Artwork
                        src={track.artworkUrl}
                        alt={track.title}
                        size={44}
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
                          {track.artist} · {formatBytes(entry.sizeBytes)}
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
                    <button
                      type="button"
                      onClick={async () => {
                        await removeFromVault(track.id);
                        removeTrack(track.id);
                        player.toast("Removed from device");
                      }}
                      aria-label={`Remove ${track.title} from device`}
                      className="press grid h-8 w-8 place-items-center rounded-full"
                      style={{ color: "var(--ink-mute)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Download size={18} />}
              title="Vault is empty"
              body="Use the download button in the player to store a track for flights and patchy signal."
            />
          )}
        </section>
      ) : null}

      <p className="px-1 text-[11px]" style={{ color: "var(--ink-faint)" }}>
        Library is stored on this device and stays in sync between your open tabs.
      </p>

      {segment === "liked" && liked.length > 0 ? (
        <SectionHead title="Add to a playlist" />
      ) : null}
      {segment === "liked" && liked.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {library.playlists.slice(0, 4).map((playlist) => (
            <Chip
              key={playlist.id}
              onClick={() => {
                if (player.current) {
                  addToPlaylist(playlist.id, player.current.id);
                  player.toast(`Added to ${playlist.name}`);
                } else {
                  onOpenPlaylist(liked[0]);
                }
              }}
            >
              {playlist.name}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="lg lg-flat flex flex-col items-center px-5 py-9 text-center" style={{ borderRadius: 24 }}>
      <span
        className="grid h-11 w-11 place-items-center rounded-full"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        {icon}
      </span>
      <p className="mt-3 text-[14px] font-semibold">{title}</p>
      <p className="mt-1 max-w-[260px] text-[12px]" style={{ color: "var(--ink-mute)" }}>
        {body}
      </p>
    </div>
  );
}
