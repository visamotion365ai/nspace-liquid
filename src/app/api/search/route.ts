import { NextRequest } from "next/server";
import { searchMusicCatalog } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 1000 * 60 * 3;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  const limit = Math.min(24, Math.max(4, Number(searchParams.get("limit") || 12)));

  if (query.length < 1) {
    return Response.json({ results: [] });
  }

  const key = `${query.toLowerCase()}:${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return Response.json({ results: hit.data, cached: true });
  }

  try {
    const results = await searchMusicCatalog(query, limit);
    cache.set(key, { at: Date.now(), data: results });
    if (cache.size > 80) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    return Response.json({ results, cached: false });
  } catch (err) {
    return Response.json(
      {
        results: [],
        error: err instanceof Error ? err.message : "Live search failed",
      },
      { status: 200 }
    );
  }
}
