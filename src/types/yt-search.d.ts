declare module "yt-search" {
  export interface YtVideo {
    videoId: string;
    title: string;
    url: string;
    thumbnail?: string;
    seconds: number;
    timestamp?: string;
    author?: { name?: string; url?: string };
    ago?: string;
    views?: number;
  }
  export interface YtResult {
    videos: YtVideo[];
    playlists?: unknown[];
    accounts?: unknown[];
  }
  export default function yts(query: string): Promise<YtResult>;
}
