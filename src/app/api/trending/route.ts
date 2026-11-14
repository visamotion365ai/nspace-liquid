import { NextRequest } from "next/server";
import { searchMusicCatalog, type SearchTrackCandidate } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Mood = {
  id: string;
  label: string;
  queries: string[];
};

export const MOODS: Mood[] = [
  { id: "for-you", label: "For You", queries: ["top hits 2026 playlist", "best of apple music"] },
  { id: "chill", label: "Chill", queries: ["lofi chill mix", "acoustic chill songs"] },
  { id: "focus", label: "Focus", queries: ["deep focus instrumental", "study ambient music"] },
  { id: "energy", label: "Energy", queries: ["workout edm mix", "hip hop hits"] },
  { id: "bangla", label: "Bangla", queries: ["bangla new song 2026", "bangla lofi mix"] },
  { id: "throwback", label: "Throwback", queries: ["2000s hits playlist", "classic pop hits"] },
];

const cache = new Map<string, { at: number; data: SearchTrackCandidate[] }>();
const TTL = 1000 * 60 * 6;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const moodId = searchParams.get("mood") || "for-you";
  const mood = MOODS.find((m) => m.id === moodId) || MOODS[0];

  const hit = cache.get(mood.id);
  if (hit && Date.now() - hit.at < TTL) {
    return Response.json({ mood: mood.id, results: hit.data, cached: true });
  }

  try {
    const seen = new Set<string>();
    const merged: SearchTrackCandidate[] = [];
    for (const query of mood.queries) {
      if (merged.length >= 10) break;
      const batch = await searchMusicCatalog(query, 12).catch(() => []);
      for (const item of batch) {
        if (!item.youtubeVideoId || seen.has(item.youtubeVideoId)) continue;
        seen.add(item.youtubeVideoId);
        merged.push(item);
      }
    }
    cache.set(mood.id, { at: Date.now(), data: merged });
    return Response.json({ mood: mood.id, results: merged, cached: false });
  } catch (err) {
    return Response.json({
      mood: mood.id,
      results: [],
      error: err instanceof Error ? err.message : "Live feed unavailable",
    });
  }
}
