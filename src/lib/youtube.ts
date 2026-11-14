import { Ytdl } from "@distube/ytdl-core";
import yts from "yt-search";

export interface ResolvedAudioStream {
  videoId: string;
  streamUrl: string;
  mimeType: string;
  bitrate: number;
  title: string;
  artist: string;
  durationSeconds: number;
  artworkUrl: string;
  source: "youtube" | "itunes";
  expiresAt: number;
}

const globalCache = globalThis as typeof globalThis & {
  __nspaceYtStreamCache?: Map<string, ResolvedAudioStream>;
};

const streamCache =
  globalCache.__nspaceYtStreamCache ?? new Map<string, ResolvedAudioStream>();
globalCache.__nspaceYtStreamCache = streamCache;

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      if (
        (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") &&
        parts[1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    const match = trimmed.match(
      /(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/
    );
    if (match?.[1]) return match[1];
  }
  return null;
}

export function cleanArtistAndTitle(rawTitle: string, channelName?: string) {
  let title = rawTitle
    .replace(/\(Official.*?\)/gi, "")
    .replace(/\[Official.*?\]/gi, "")
    .replace(/\(Audio\)/gi, "")
    .replace(/\(Lyrics?\)/gi, "")
    .replace(/\|.*$/g, "")
    .trim();
  let artist = (channelName || "NSpace Artist")
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .trim();

  if (title.includes(" - ")) {
    const [left, ...rest] = title.split(" - ");
    if (left.trim().length > 1 && rest.join(" - ").trim().length > 1) {
      artist = left.trim();
      title = rest.join(" - ").trim();
    }
  }
  return { title: title || rawTitle, artist: artist || "Unknown Artist" };
}

export async function resolveYouTubeAudio(
  videoId: string,
  fallbackQuery?: string,
  preferFormat: "m4a" | "opus" = "m4a"
): Promise<ResolvedAudioStream> {
  const cacheKey = `${videoId}:${preferFormat}`;
  const cached = streamCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  try {
    const ytdl = new Ytdl();
    const info = await ytdl.getInfo(
      `https://www.youtube.com/watch?v=${videoId}`
    );

    const audioOnly = info.formats.filter(
      (f) => f.hasAudio && !f.hasVideo && Boolean(f.url)
    );

    const m4aFormats = audioOnly
      .filter((f) => f.mimeType?.includes("audio/mp4"))
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

    const opusFormats = audioOnly
      .filter((f) => f.mimeType?.includes("audio/webm"))
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

    const anyAudio = info.formats
      .filter((f) => f.hasAudio && Boolean(f.url))
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

    const selected =
      preferFormat === "opus"
        ? opusFormats[0] || m4aFormats[0] || anyAudio[0]
        : m4aFormats[0] || opusFormats[0] || anyAudio[0];

    if (!selected?.url) {
      throw new Error("No audio stream found");
    }

    const details = info.videoDetails;
    const { title, artist } = cleanArtistAndTitle(
      details?.title || "YouTube Audio",
      details?.author?.name
    );

    const thumbnails = details?.thumbnails || [];
    const artworkUrl =
      thumbnails[thumbnails.length - 1]?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const resolved: ResolvedAudioStream = {
      videoId,
      streamUrl: selected.url,
      mimeType: selected.mimeType?.split(";")[0] || "audio/mp4",
      bitrate: selected.audioBitrate || 128,
      title,
      artist,
      durationSeconds: Number(details?.lengthSeconds || 210),
      artworkUrl,
      source: "youtube",
      expiresAt: Date.now() + 20 * 60 * 1000,
    };

    streamCache.set(cacheKey, resolved);
    return resolved;
  } catch (err) {
    // Fallback to iTunes Search API if YouTube blocks or fails
    if (fallbackQuery) {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          fallbackQuery
        )}&media=music&limit=1`
      );
      if (itunesRes.ok) {
        const data = await itunesRes.json();
        const item = data.results?.[0];
        if (item?.previewUrl) {
          const resolved: ResolvedAudioStream = {
            videoId,
            streamUrl: item.previewUrl,
            mimeType: "audio/mp4",
            bitrate: 256,
            title: item.trackName || fallbackQuery,
            artist: item.artistName || "Unknown Artist",
            durationSeconds: Math.round((item.trackTimeMillis || 30000) / 1000),
            artworkUrl: (item.artworkUrl100 || "").replace(
              "100x100",
              "600x600"
            ),
            source: "itunes",
            expiresAt: Date.now() + 20 * 60 * 1000,
          };
          streamCache.set(cacheKey, resolved);
          return resolved;
        }
      }
    }
    throw err;
  }
}

export interface SearchTrackCandidate {
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  audioUrl: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  durationSeconds: number;
  explicit: boolean;
  sourceType: "youtube" | "itunes";
  audioQuality: string;
}

export async function searchMusicCatalog(
  query: string,
  limit = 10
): Promise<SearchTrackCandidate[]> {
  const results: SearchTrackCandidate[] = [];

  const ytSearch = async () => {
    try {
      return await yts(query);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        return await yts(query);
      } catch {
        return { videos: [] as { videoId: string; seconds: number }[] } as unknown as Awaited<
          ReturnType<typeof yts>
        >;
      }
    }
  };

  const [ytResult, itunesResult] = await Promise.allSettled([
    ytSearch(),
    fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        query
      )}&media=music&limit=6`
    ).then((r) => r.json()),
  ]);

  const itunesMap = new Map<
    string,
    { artwork: string; artist: string; track: string; album: string; explicit: boolean }
  >();

  if (itunesResult.status === "fulfilled" && Array.isArray(itunesResult.value?.results)) {
    for (const item of itunesResult.value.results) {
      const key = `${(item.trackName || "").toLowerCase()}::${(
        item.artistName || ""
      ).toLowerCase()}`;
      itunesMap.set(key, {
        artwork: (item.artworkUrl100 || "").replace("100x100bb", "600x600bb"),
        artist: item.artistName || "Unknown Artist",
        track: item.trackName || query,
        album: item.collectionName || "Single",
        explicit: item.trackExplicitness === "explicit",
      });
    }
  }

  if (ytResult.status === "fulfilled" && Array.isArray(ytResult.value?.videos)) {
    const filtered = ytResult.value.videos
      .filter((v: { videoId: string; seconds: number }) => v.videoId && v.seconds > 30 && v.seconds < 900)
      .slice(0, limit);

    for (const v of filtered) {
      const { title, artist } = cleanArtistAndTitle(v.title, v.author?.name);
      // Try matching high-res artwork from iTunes results
      let artwork = v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
      let explicit = false;
      let album = "NSpace Hi-Res Stream";

      for (const [, meta] of itunesMap) {
        if (
          title.toLowerCase().includes(meta.track.toLowerCase()) ||
          meta.track.toLowerCase().includes(title.toLowerCase())
        ) {
          if (meta.artwork) artwork = meta.artwork;
          explicit = meta.explicit;
          album = meta.album;
          break;
        }
      }

      results.push({
        title,
        artist,
        album,
        artworkUrl: artwork,
        audioUrl: `/api/stream?v=${encodeURIComponent(
          v.videoId
        )}&q=${encodeURIComponent(`${title} ${artist}`)}`,
        youtubeUrl: v.url,
        youtubeVideoId: v.videoId,
        durationSeconds: v.seconds || 200,
        explicit,
        sourceType: "youtube",
        audioQuality: "Hi-Res • 320 kbps",
      });
    }
  }

  // Fallback if YouTube search returned nothing
  if (results.length === 0 && itunesResult.status === "fulfilled") {
    for (const item of itunesResult.value?.results || []) {
      if (!item.previewUrl) continue;
      results.push({
        title: item.trackName || query,
        artist: item.artistName || "Unknown Artist",
        album: item.collectionName || "Apple Preview",
        artworkUrl: (item.artworkUrl100 || "").replace("100x100bb", "600x600bb"),
        audioUrl: `/api/audio-proxy?url=${encodeURIComponent(item.previewUrl)}`,
        youtubeUrl: "",
        youtubeVideoId: "",
        durationSeconds: Math.round((item.trackTimeMillis || 30000) / 1000),
        explicit: item.trackExplicitness === "explicit",
        sourceType: "itunes",
        audioQuality: "Lossless AAC • 256 kbps",
      });
    }
  }

  return results;
}
