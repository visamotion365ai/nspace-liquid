export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  audioUrl: string;
  sourceType: "youtube" | "itunes" | "local";
  youtubeUrl?: string;
  youtubeVideoId?: string;
  durationSeconds: number;
  explicit?: boolean;
  audioQuality: string;
  accentColor: string;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  artworkUrl?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AgentTurn {
  id: string;
  prompt: string;
  reply: string;
  trackId?: string;
  createdAt: number;
}

export interface Settings {
  theme: "light" | "dark" | "system";
  eqPreset: string;
  eqBands: number[];
  spatialEnabled: boolean;
  bassBoost: number;
  quality: "hi-res" | "balanced" | "saver";
  provider: string;
  apiKeyMasked?: string;
  hasApiKey: boolean;
  crossfade: boolean;
  autoplay: boolean;
}

export interface SearchCandidate {
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

export type TabId = "home" | "search" | "library" | "agent" | "settings";

export type DeviceClass = "phone" | "tablet" | "desktop";

export interface LibraryState {
  tracks: Track[];
  likedIds: string[];
  playlists: Playlist[];
  recentIds: string[];
}
