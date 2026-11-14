import { NextRequest } from "next/server";
import {
  extractYouTubeVideoId,
  resolveYouTubeAudio,
  searchMusicCatalog,
  type SearchTrackCandidate,
} from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MOOD_MAP: Record<string, string> = {
  gym: "workout energy mix",
  workout: "workout energy mix",
  run: "running motivation music",
  study: "deep focus instrumental",
  focus: "deep focus instrumental",
  work: "focus instrumental",
  sleep: "calm sleep music",
  calm: "calm ambient music",
  relax: "relaxing acoustic",
  sad: "emotional acoustic songs",
  happy: "feel good hits",
  party: "party dance hits",
  drive: "night drive playlist",
  rainy: "rainy day lofi",
  lofi: "lofi hip hop mix",
  bangla: "bangla new song",
  bangla_old: "bangla classic hits",
  romantic: "romantic love songs",
  travel: "travel playlist",
  morning: "morning coffee playlist",
  night: "late night r&b",
};

interface Intent {
  query: string;
  mood: string | null;
  directVideoId: string | null;
  download: boolean;
  summary: string;
}

function cleanPrompt(prompt: string): Intent {
  const lower = prompt.toLowerCase();
  const directVideoId = extractYouTubeVideoId(prompt);
  const download = /\b(download|offline|save|store)\b/.test(lower);

  let mood: string | null = null;
  for (const key of Object.keys(MOOD_MAP)) {
    if (lower.includes(key)) {
      mood = key;
      break;
    }
  }

  const stripped = prompt
    .replace(/https?:\/\/\S+/g, " ")
    .replace(
      /\b(please|hey|ok|can you|could you|would you|i want|i need|i'd like|for me|find|search|play|stream|put on|queue|download|offline|save|store|some|something|song|songs|track|tracks|music|listen|to|the|a|an|in|on|by|me|my|for|like|that|this|is|are|hi-res|high quality|now|next)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const query =
    stripped.length >= 2
      ? stripped
      : mood
        ? MOOD_MAP[mood]
        : prompt.trim();

  return {
    query,
    mood,
    directVideoId,
    download,
    summary: directVideoId
      ? "Resolving that exact link"
      : mood
        ? `Tuning the mix toward ${mood}`
        : `Searching the live catalogue for “${query}”`,
  };
}

async function refineWithKey(
  prompt: string,
  provider: string,
  apiKey: string
): Promise<string | null> {
  try {
    if (provider === "openai" && apiKey.startsWith("sk-")) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'You are a music search assistant. Reply JSON: {"query":"short search query with artist if known","say":"one warm sentence under 14 words"}. Never promise anything you cannot do.',
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") return null;
      const parsed = JSON.parse(content) as { query?: string; say?: string };
      return parsed.query?.trim() || null;
    }
    if (provider === "anthropic" && apiKey.startsWith("sk-ant")) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 120,
          messages: [
            {
              role: "user",
              content: `Return only a short music search query (max 8 words) for this request: "${prompt}"`,
            },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.content?.[0]?.text;
      return typeof text === "string" ? text.trim().slice(0, 80) : null;
    }
  } catch {
    return null;
  }
  return null;
}

function toCandidate(
  query: string,
  results: SearchTrackCandidate[]
): SearchTrackCandidate | null {
  if (!results.length) return null;
  const q = query.toLowerCase();
  const scored = results
    .map((item) => {
      const haystack = `${item.title} ${item.artist}`.toLowerCase();
      const overlap = q
        .split(/\s+/)
        .filter((word) => word.length > 2 && haystack.includes(word)).length;
      return { item, score: overlap };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.item || null;
}

export async function POST(req: NextRequest) {
  let prompt = "";
  let provider = "base44";
  let apiKey = "";

  try {
    const body = await req.json();
    prompt = String(body.prompt || "").trim();
    provider = String(body.provider || "base44");
    apiKey = String(body.apiKey || "").trim();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!prompt) {
    return Response.json({ error: "Say what you want to hear" }, { status: 400 });
  }

  if (!apiKey) {
    const envOpenai = process.env.OPENAI_API_KEY || "";
    const envAnthropic = process.env.ANTHROPIC_API_KEY || "";
    if (envOpenai) {
      provider = "openai";
      apiKey = envOpenai;
    } else if (envAnthropic) {
      provider = "anthropic";
      apiKey = envAnthropic;
    }
  }

  const intent = cleanPrompt(prompt);

  try {
    if (intent.directVideoId) {
      const resolved = await resolveYouTubeAudio(
        intent.directVideoId,
        intent.query
      );
      return Response.json({
        reply: `Playing ${resolved.title} straight from the link.`,
        track: {
          title: resolved.title,
          artist: resolved.artist,
          album: "Direct link",
          artworkUrl: resolved.artworkUrl,
          audioUrl: `/api/stream?v=${resolved.videoId}`,
          youtubeUrl: `https://www.youtube.com/watch?v=${resolved.videoId}`,
          youtubeVideoId: resolved.videoId,
          durationSeconds: resolved.durationSeconds,
          explicit: false,
          sourceType: resolved.source === "itunes" ? "itunes" : "youtube",
          audioQuality: `Hi-Res • ${resolved.bitrate} kbps`,
        },
      });
    }

    const refined = apiKey ? await refineWithKey(prompt, provider, apiKey) : null;
    const query = refined || intent.query;
    const results = await searchMusicCatalog(query, 10);
    const best = toCandidate(query, results);

    if (!best) {
      return Response.json({
        reply: "The live catalogue returned nothing for that. Try an artist name.",
        track: null,
        results: [],
      });
    }

    const others = results.filter(
      (r) => r.youtubeVideoId !== best.youtubeVideoId
    ).slice(0, 6);

    return Response.json({
      reply: `Here's ${best.title} by ${best.artist}. ${intent.download ? "Saving it offline too." : "Queued up in your mix."}`,
      track: best,
      results: others,
      intent: { mood: intent.mood, query },
    });
  } catch (err) {
    return Response.json(
      {
        reply:
          "That one wouldn't resolve. The stream may be region-locked. Try another title.",
        track: null,
        error: err instanceof Error ? err.message : "Agent failed",
      },
      { status: 200 }
    );
  }
}
