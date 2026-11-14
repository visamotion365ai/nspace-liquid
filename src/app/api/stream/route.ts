import { NextRequest } from "next/server";
import { resolveYouTubeAudio } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("v");
    const fallbackQuery = searchParams.get("q") || undefined;
    const format = searchParams.get("format") === "opus" ? "opus" : "m4a";
    const isDownload = searchParams.get("download") === "1";
    const customTitle = searchParams.get("title") || "nspace-audio";

    if (!videoId) {
      return Response.json({ error: "Missing video id 'v'" }, { status: 400 });
    }

    const resolved = await resolveYouTubeAudio(videoId, fallbackQuery, format);
    const rangeHeader = req.headers.get("range");

    const upstreamHeaders: HeadersInit = {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    };
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    const upstream = await fetch(resolved.streamUrl, {
      headers: upstreamHeaders,
    });

    if (!upstream.ok && upstream.status !== 206) {
      return Response.json(
        { error: "Upstream audio stream unavailable" },
        { status: 502 }
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") || resolved.mimeType || "audio/mp4"
    );
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=3600");

    if (isDownload) {
      const ext = resolved.mimeType.includes("webm") ? "webm" : "m4a";
      const safeName = customTitle
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .trim()
        .slice(0, 60);
      headers.set(
        "Content-Disposition",
        `attachment; filename="${safeName || "nspace-track"}.${ext}"`
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    console.error("stream error", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to stream YouTube audio",
      },
      { status: 500 }
    );
  }
}
