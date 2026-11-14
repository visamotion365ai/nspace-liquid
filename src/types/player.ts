import type { Track } from "./music";

export interface PlayerApi {
  current: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  queue: Track[];
  shuffle: boolean;
  repeat: boolean;
  downloadingId: string | null;
  play: (track: Track, context?: Track[]) => void;
  playAll: (tracks: Track[], startIndex?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  openPlayer: () => void;
  openQueue: () => void;
  openEq: () => void;
  openTrackMenu: (track: Track) => void;
  addToQueue: (track: Track) => void;
  like: (track: Track) => void;
  isLiked: (id: string) => boolean;
  download: (track: Track) => void;
  toast: (message: string) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}
