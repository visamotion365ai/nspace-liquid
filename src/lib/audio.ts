export const EQ_FREQUENCIES = [
  32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
] as const;

export const EQ_LABELS = [
  "32",
  "64",
  "125",
  "250",
  "500",
  "1K",
  "2K",
  "4K",
  "8K",
  "16K",
] as const;

export interface EqPreset {
  id: string;
  name: string;
  bands: number[];
}

export const EQ_PRESETS: EqPreset[] = [
  {
    id: "apple-signature",
    name: "Apple Hi-Res",
    bands: [3, 2, 1, 0, 1, 2, 3, 4, 3, 2],
  },
  {
    id: "flat",
    name: "Studio Flat",
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: "bass-boost",
    name: "Deep Bass",
    bands: [6, 5, 4, 2, 0, 0, 1, 2, 3, 2],
  },
  {
    id: "vocal",
    name: "Vocal Clarity",
    bands: [-1, 0, 1, 3, 4, 4, 3, 2, 1, 1],
  },
  {
    id: "electronic",
    name: "Spatial EDM",
    bands: [5, 4, 2, 0, -1, 1, 3, 4, 5, 4],
  },
  {
    id: "acoustic",
    name: "Acoustic Warm",
    bands: [2, 2, 1, 0, 1, 2, 3, 2, 2, 1],
  },
];

export class NSpaceAudioEngine {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private bassFilter: BiquadFilterNode | null = null;
  private airFilter: BiquadFilterNode | null = null;
  private spatialDelay: DelayNode | null = null;
  private spatialGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private initializedElement: HTMLAudioElement | null = null;

  public init(audioEl: HTMLAudioElement) {
    if (this.initializedElement === audioEl && this.ctx) {
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(audioEl);

    // 10-band EQ
    const filters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = ctx.createBiquadFilter();
      filter.type =
        idx === 0
          ? "lowshelf"
          : idx === EQ_FREQUENCIES.length - 1
            ? "highshelf"
            : "peaking";
      filter.frequency.value = freq;
      filter.Q.value = 1.1;
      filter.gain.value = 0;
      return filter;
    });

    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 85;
    bassFilter.gain.value = 2.5;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "highshelf";
    airFilter.frequency.value = 7500;
    airFilter.gain.value = 2.0;

    // Spatial Haas ambient widener
    const spatialDelay = ctx.createDelay(0.05);
    spatialDelay.delayTime.value = 0.011;
    const spatialGain = ctx.createGain();
    spatialGain.gain.value = 0.16;

    // Mastering peak limiter
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 14;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.15;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;

    // Wire graph: source -> eq[0..9] -> bassFilter -> airFilter -> compressor -> analyser -> destination
    let node: AudioNode = source;
    for (const f of filters) {
      node.connect(f);
      node = f;
    }
    node.connect(bassFilter);
    bassFilter.connect(airFilter);

    // Direct path
    airFilter.connect(compressor);
    // Spatial parallel path
    airFilter.connect(spatialDelay);
    spatialDelay.connect(spatialGain);
    spatialGain.connect(compressor);

    compressor.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    this.ctx = ctx;
    this.source = source;
    this.filters = filters;
    this.bassFilter = bassFilter;
    this.airFilter = airFilter;
    this.spatialDelay = spatialDelay;
    this.spatialGain = spatialGain;
    this.compressor = compressor;
    this.masterGain = masterGain;
    this.analyser = analyser;
    this.initializedElement = audioEl;
  }

  public resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public setEqBands(bands: number[]) {
    if (!this.filters.length) return;
    bands.forEach((gainDb, i) => {
      if (this.filters[i]) {
        this.filters[i].gain.value = Math.max(-12, Math.min(12, gainDb));
      }
    });
  }

  public setSpatialEnabled(enabled: boolean) {
    if (this.spatialGain) {
      this.spatialGain.gain.value = enabled ? 0.18 : 0;
    }
    if (this.airFilter) {
      this.airFilter.gain.value = enabled ? 2.5 : 0.5;
    }
  }

  public setBassBoost(percent: number) {
    if (this.bassFilter) {
      this.bassFilter.gain.value = (Math.max(0, Math.min(100, percent)) / 100) * 7.5;
    }
  }

  public getFrequencyData(): number[] {
    if (!this.analyser) return [24, 52, 76, 44, 62];
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return [
      data[1] || 0,
      data[3] || 0,
      data[6] || 0,
      data[10] || 0,
      data[15] || 0,
    ];
  }
}
