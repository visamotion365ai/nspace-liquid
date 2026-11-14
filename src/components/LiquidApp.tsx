"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Moon, RefreshCw, Sun, Wifi, WifiOff } from "lucide-react";
import type { DeviceClass, Playlist, TabId, Track } from "@/types/music";
import type { PlayerApi } from "@/types/player";
import {
  addToPlaylist,
  clearLibrary,
  createPlaylist,
  deletePlaylist,
  hydrateStore,
  patchSettings,
  pushRecent,
  removeTrack,
  toggleLike,
  upsertTrack,
  useLibrary,
} from "@/lib/store";
import { NSpaceAudioEngine, EQ_PRESETS } from "@/lib/audio";
import {
  downloadWithProgress,
  getFromVault,
  listVault,
  removeFromVault,
  saveToVault,
} from "@/lib/vault";
import { clockNow, formatBytes, shiftColor } from "@/lib/format";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { MiniPlayer } from "./MiniPlayer";
import { NowPlayingPanel, NowPlayingSheet } from "./NowPlaying";
import { HomeView } from "./HomeView";
import { SearchView } from "./SearchView";
import { LibraryView } from "./LibraryView";
import { AgentView } from "./AgentView";
import { SettingsView } from "./SettingsView";
import { QueueSheet, EqSheet, Sheet } from "./Sheets";
import { Toast } from "./ui";

export function LiquidApp() {
  const library = useLibrary();
  const settings = library.settings;

  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<TabId>("home");
  const [device, setDevice] = useState<DeviceClass>("phone");
  const [online, setOnline] = useState(true);
  const [clock, setClock] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const [queue, setQueue] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [playIntent, setPlayIntent] = useState(false);

  const [sheet, setSheet] = useState<null | "player" | "queue" | "eq">(null);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [playlistSheetTrack, setPlaylistSheetTrack] = useState<Track | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [vault, setVault] = useState<{ trackId: string; sizeBytes: number }[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<NSpaceAudioEngine | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const loadedIdRef = useRef<string | null>(null);

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === message ? null : prev));
    }, 2600);
  }, []);

  /* ---------------------------------------------------------- boot */
  useEffect(() => {
    hydrateStore();
    setHydrated(true);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["home", "search", "library", "agent", "settings"].includes(tabParam)) {
      setTab(tabParam as TabId);
    }

    const tick = () => setClock(clockNow());
    tick();
    const timer = window.setInterval(tick, 20000);

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.clearInterval(timer);
    };
  }, []);

  /* ------------------------------------------------- device class */
  useEffect(() => {
    const compute = () => {
      const width = window.innerWidth;
      if (width >= 1180) setDevice("desktop");
      else if (width >= 820) setDevice("tablet");
      else setDevice("phone");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  /* ------------------------------------------------- theme control */
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        settings.theme === "dark" ||
        (settings.theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", dark ? "#08080A" : "#ECEEF3");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme]);

  /* ------------------------------------------- adaptive glass tint */
  useEffect(() => {
    const accent = current?.accentColor || "#FA243C";
    document.documentElement.style.setProperty("--tint", accent);
    document.documentElement.style.setProperty("--tint-2", shiftColor(accent, 42));
  }, [current?.accentColor]);

  /* -------------------------------------------------- vault index */
  const refreshVault = useCallback(async () => {
    const entries = await listVault();
    setVault(
      entries.map((entry) => ({
        trackId: entry.trackId,
        sizeBytes: entry.sizeBytes,
      }))
    );
  }, []);

  useEffect(() => {
    if (hydrated) void refreshVault();
  }, [hydrated, refreshVault]);

  /* -------------------------------------------------- audio graph */
  const ensureEngine = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!engineRef.current) engineRef.current = new NSpaceAudioEngine();
    engineRef.current.init(audio);
    engineRef.current.resume();
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setEqBands(settings.eqBands);
    engine.setSpatialEnabled(settings.spatialEnabled);
    engine.setBassBoost(settings.bassBoost);
  }, [settings.eqBands, settings.spatialEnabled, settings.bassBoost]);

  useEffect(() => {
    const engine = engineRef.current;
    if (engine) engine.setEqBands(settings.eqBands);
  }, [settings.eqBands]);

  /* --------------------------------------------- load + play track */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (loadedIdRef.current === current.id) return;
    loadedIdRef.current = current.id;

    let cancelled = false;
    (async () => {
      const entry = await getFromVault(current.id);
      if (cancelled) return;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      let src = current.audioUrl;
      if (entry) {
        src = URL.createObjectURL(entry.blob);
        objectUrlRef.current = src;
      }
      audio.src = src;
      audio.load();
      setProgress(0);
      setDuration(current.durationSeconds || 0);
      if (playIntent) {
        ensureEngine();
        audio.play().catch(() => {
          setIsPlaying(false);
          toast("Tap play again to start audio on this device.");
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) {
      ensureEngine();
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, current?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  /* ------------------------------------------------- media session */
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.album,
        artwork: [
          { src: current.artworkUrl, sizes: "512x512", type: "image/jpeg" },
        ],
      });
      navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler("nexttrack", () => void handleNextRef.current());
      navigator.mediaSession.setActionHandler("previoustrack", () => void handlePrevRef.current());
    } catch {
      /* media session is best effort */
    }
  }, [current]);

  /* ---------------------------------------------------- queue logic */
  const pickNext = useCallback(
    (direction: 1 | -1): Track | null => {
      if (!queue.length) return null;
      const index = current ? queue.findIndex((t) => t.id === current.id) : -1;
      if (shuffle && queue.length > 1) {
        let candidate = current;
        for (let i = 0; i < 8 && candidate?.id === current?.id; i += 1) {
          candidate = queue[Math.floor(Math.random() * queue.length)];
        }
        return candidate || null;
      }
      const nextIndex = index + direction;
      if (nextIndex < 0) return repeat ? queue[queue.length - 1] : queue[0];
      if (nextIndex >= queue.length) {
        return repeat ? queue[0] : null;
      }
      return queue[nextIndex];
    },
    [queue, current, shuffle, repeat]
  );

  const handleNext = useCallback(() => {
    const next = pickNext(1);
    if (!next) {
      setIsPlaying(false);
      return;
    }
    setPlayIntent(true);
    setIsPlaying(true);
    setCurrent(next);
    pushRecent(next.id);
  }, [pickNext]);

  const handlePrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 4) {
      audio.currentTime = 0;
      return;
    }
    const prev = pickNext(-1);
    if (!prev) return;
    setPlayIntent(true);
    setIsPlaying(true);
    setCurrent(prev);
  }, [pickNext]);

  const handleNextRef = useRef(handleNext);
  const handlePrevRef = useRef(handlePrev);
  useEffect(() => {
    handleNextRef.current = handleNext;
    handlePrevRef.current = handlePrev;
  }, [handleNext, handlePrev]);

  /* ------------------------------------------------------- actions */
  const play = useCallback(
    (track: Track, context?: Track[]) => {
      const libraryTrack = upsertTrack(track);
      if (context && context.length) setQueue(context);
      else setQueue((prev) => (prev.some((t) => t.id === track.id) ? prev : [track, ...prev]));
      pushRecent(libraryTrack.id);
      if (current?.id === track.id) {
        setIsPlaying((prev) => !prev);
        return;
      }
      setPlayIntent(true);
      setIsPlaying(true);
      setCurrent(libraryTrack);
    },
    [current?.id]
  );

  const playAll = useCallback(
    (tracks: Track[], startIndex = 0) => {
      if (!tracks.length) return;
      const safeIndex = Math.min(Math.max(0, startIndex), tracks.length - 1);
      setQueue(tracks);
      const track = upsertTrack(tracks[safeIndex]);
      pushRecent(track.id);
      setPlayIntent(true);
      setIsPlaying(true);
      setCurrent(track);
    },
    []
  );

  const toggle = useCallback(() => {
    if (!current) return;
    setPlayIntent(true);
    setIsPlaying((prev) => !prev);
  }, [current]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setProgress(seconds);
  }, []);

  const download = useCallback(
    async (track: Track) => {
      if (downloadingId) return;
      setDownloadingId(track.id);
      try {
        const { blob, mimeType } = await downloadWithProgress(track.audioUrl);
        await saveToVault({
          trackId: track.id,
          title: track.title,
          artist: track.artist,
          artworkUrl: track.artworkUrl,
          mimeType,
          sizeBytes: blob.size,
          savedAt: Date.now(),
          blob,
        });
        await refreshVault();
        toast(`Saved offline · ${formatBytes(blob.size)}`);
      } catch {
        toast("Could not save that track offline.");
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, refreshVault, toast]
  );

  const like = useCallback(
    (track: Track) => {
      toggleLike(track);
      toast(
        library.likedIds.includes(track.id)
          ? "Removed from Liked"
          : "Added to Liked"
      );
    },
    [library.likedIds, toast]
  );

  const addTrackToQueue = useCallback(
    (track: Track) => {
      setQueue((prev) =>
        prev.some((t) => t.id === track.id) ? prev : [...prev, track]
      );
      toast("Added to queue");
    },
    [toast]
  );

  const player: PlayerApi = useMemo(
    () => ({
      current,
      isPlaying,
      progress,
      duration: duration || current?.durationSeconds || 0,
      volume,
      queue,
      shuffle,
      repeat,
      downloadingId,
      play,
      playAll,
      toggle,
      next: handleNext,
      prev: handlePrev,
      seek,
      setVolume,
      openPlayer: () => setSheet("player"),
      openQueue: () => setSheet("queue"),
      openEq: () => setSheet("eq"),
      openTrackMenu: (track: Track) => setMenuTrack(track),
      addToQueue: addTrackToQueue,
      like,
      isLiked: (id: string) => library.likedIds.includes(id),
      download: (track: Track) => void download(track),
      toast,
      toggleShuffle: () => setShuffle((prev) => !prev),
      toggleRepeat: () => setRepeat((prev) => !prev),
    }),
    [
      current,
      isPlaying,
      progress,
      duration,
      volume,
      queue,
      shuffle,
      repeat,
      downloadingId,
      play,
      playAll,
      toggle,
      handleNext,
      handlePrev,
      seek,
      addTrackToQueue,
      like,
      library.likedIds,
      download,
      toast,
    ]
  );

  const onScroll = (event: React.UIEvent<HTMLElement>) => {
    setScrolled(event.currentTarget.scrollTop > 8);
  };

  const cycleTheme = () => {
    const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const next = order[(order.indexOf(settings.theme) + 1) % order.length];
    patchSettings({ theme: next });
  };

  return (
    <>
      <div className="liquid-stage" aria-hidden>
        <div className="liquid-blob b1" />
        <div className="liquid-blob b2" />
        <div className="liquid-blob b3" />
        <div className="liquid-grain" />
      </div>

      <div className="app-shell">
        <Sidebar tab={tab} onTab={setTab} device={device} />

        <main
          className="scroll-area relative flex h-[100dvh] flex-col"
          onScroll={onScroll}
        >
          <header
            className={`sticky top-0 z-30 flex items-center gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+14px)] transition-colors duration-300 sm:px-6 ${
              scrolled ? "lg lg-weak" : ""
            }`}
            style={{ borderRadius: scrolled ? "0 0 24px 24px" : 0 }}
          >
            <div className="min-w-0 flex-1">
              <p className="eyebrow">{clock || "N Space"}</p>
              <h1 className="display truncate text-[26px] leading-none sm:text-[30px]">
                {tab === "home"
                  ? "N Space"
                  : tab === "search"
                    ? "Search"
                    : tab === "library"
                      ? "Library"
                      : tab === "agent"
                        ? "AI DJ"
                        : "Settings"}
              </h1>
            </div>
            <div
              className="lg lg-flat lg-round hidden items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold sm:flex"
              style={{ color: online ? "var(--ink-soft)" : "var(--accent)" }}
            >
              {online ? <Wifi size={12} /> : <WifiOff size={12} />}
              {online ? "Live" : "Offline"}
            </div>
            <button
              type="button"
              onClick={cycleTheme}
              aria-label="Change theme"
              className="press lg lg-flat lg-round grid h-9 w-9 place-items-center"
              style={{ color: "var(--ink-soft)" }}
            >
              {settings.theme === "dark" ? (
                <Moon size={16} />
              ) : settings.theme === "light" ? (
                <Sun size={16} />
              ) : (
                <RefreshCw size={15} />
              )}
            </button>
          </header>

          <div
            className="min-h-0 flex-1 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+168px)] sm:px-6 xl:pb-8"
          >
            {!hydrated ? (
              <div className="grid gap-3 pt-6">
                <div className="lg lg-panel h-48 animate-pulse" />
                <div className="lg lg-flat h-20 animate-pulse" />
              </div>
            ) : tab === "home" ? (
              <HomeView player={player} onTab={setTab} library={library} />
            ) : tab === "search" ? (
              <SearchView player={player} />
            ) : tab === "library" ? (
              <LibraryView
                player={player}
                library={library}
                vault={vault}
                onOpenPlaylist={(track) => setPlaylistSheetTrack(track)}
              />
            ) : tab === "agent" ? (
              <AgentView player={player} settings={settings} />
            ) : (
              <SettingsView
                settings={settings}
                player={player}
                vault={vault}
                onRefreshVault={refreshVault}
                onClearLibrary={() => {
                  clearLibrary();
                  toast("Library cleared");
                }}
              />
            )}
          </div>
        </main>

        <aside className="hidden h-[100dvh] py-3 pr-3 xl:block">
          <NowPlayingPanel player={player} settings={settings} />
        </aside>
      </div>

      <MiniPlayer player={player} onOpen={() => setSheet("player")} />
      <TabBar tab={tab} onTab={setTab} device={device} />

      <NowPlayingSheet
        open={sheet === "player"}
        onClose={() => setSheet(null)}
        player={player}
        settings={settings}
        onOpenEq={() => setSheet("eq")}
        onOpenQueue={() => setSheet("queue")}
        onOpenPlaylist={(track) => setPlaylistSheetTrack(track)}
      />

      <Sheet open={sheet === "queue"} onClose={() => setSheet(null)} title="Up next">
        <QueueSheet player={player} />
      </Sheet>

      <Sheet open={sheet === "eq"} onClose={() => setSheet(null)} title="Spatial EQ">
        <EqSheet
          bands={settings.eqBands}
          preset={settings.eqPreset}
          spatial={settings.spatialEnabled}
          bass={settings.bassBoost}
          onChange={(patch) => patchSettings(patch)}
        />
      </Sheet>

      <Sheet
        open={Boolean(menuTrack)}
        onClose={() => setMenuTrack(null)}
        title="Track options"
      >
        {menuTrack ? (
          <div className="grid gap-2 pb-4">
            {[
              {
                label: "Play now",
                run: () => {
                  play(menuTrack, queue);
                  setMenuTrack(null);
                },
              },
              {
                label: "Play next",
                run: () => {
                  setQueue((prev) => {
                    const rest = prev.filter((t) => t.id !== menuTrack.id);
                    return [menuTrack, ...rest];
                  });
                  toast("Playing next");
                  setMenuTrack(null);
                },
              },
              {
                label: "Add to playlist",
                run: () => {
                  setPlaylistSheetTrack(menuTrack);
                  setMenuTrack(null);
                },
              },
              {
                label: player.isLiked(menuTrack.id)
                  ? "Remove from Liked"
                  : "Add to Liked",
                run: () => {
                  like(menuTrack);
                  setMenuTrack(null);
                },
              },
              {
                label: "Save offline",
                run: () => {
                  void download(menuTrack);
                  setMenuTrack(null);
                },
              },
              {
                label: "Remove from library",
                run: () => {
                  removeTrack(menuTrack.id);
                  toast("Removed");
                  setMenuTrack(null);
                },
              },
            ].map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={row.run}
                className="press lg lg-flat w-full px-4 py-3 text-left text-[14px] font-semibold"
              >
                {row.label}
              </button>
            ))}
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(playlistSheetTrack)}
        onClose={() => setPlaylistSheetTrack(null)}
        title="Add to playlist"
      >
        {playlistSheetTrack ? (
          <div className="grid gap-2 pb-4">
            {library.playlists.length === 0 ? (
              <CreateInlinePlaylist
                onCreated={(playlist) => {
                  addToPlaylist(playlist.id, playlistSheetTrack.id);
                  toast(`Added to ${playlist.name}`);
                  setPlaylistSheetTrack(null);
                }}
              />
            ) : (
              <>
                {library.playlists.map((playlist: Playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => {
                      addToPlaylist(playlist.id, playlistSheetTrack.id);
                      toast(`Added to ${playlist.name}`);
                      setPlaylistSheetTrack(null);
                    }}
                    className="press lg lg-flat flex w-full items-center justify-between px-4 py-3 text-left text-[14px] font-semibold"
                  >
                    {playlist.name}
                    <span className="text-[12px]" style={{ color: "var(--ink-mute)" }}>
                      {playlist.trackIds.length}
                    </span>
                  </button>
                ))}
                <CreateInlinePlaylist
                  onCreated={(playlist) => {
                    addToPlaylist(playlist.id, playlistSheetTrack.id);
                    toast(`Added to ${playlist.name}`);
                    setPlaylistSheetTrack(null);
                  }}
                />
              </>
            )}
            {library.playlists.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  deletePlaylist(library.playlists[0].id);
                  toast("Deleted playlist");
                  setPlaylistSheetTrack(null);
                }}
                className="press mt-2 rounded-2xl px-4 py-2 text-[12.5px] font-semibold"
                style={{ color: "var(--accent)" }}
              >
                Delete “{library.playlists[0].name}”
              </button>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value) && value > 0) setDuration(value);
        }}
        onEnded={handleNext}
        onError={() => {
          setIsPlaying(false);
          toast("That stream failed. Trying another source.");
        }}
      />

      <Toast message={toastMsg} />
    </>
  );
}

function CreateInlinePlaylist({
  onCreated,
}: {
  onCreated: (playlist: Playlist) => void;
}) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onCreated(createPlaylist(name.trim()));
        setName("");
      }}
      className="flex gap-2"
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="New playlist name"
        className="lg lg-flat min-w-0 flex-1 rounded-2xl px-4 py-3 text-[14px] outline-none"
        style={{ color: "var(--ink)" }}
      />
      <button
        type="submit"
        className="press rounded-2xl px-4 py-3 text-[13px] font-semibold text-white"
        style={{ background: "var(--accent)" }}
      >
        Create
      </button>
    </form>
  );
}
