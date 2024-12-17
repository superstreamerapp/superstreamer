import { preciseFloat } from "./helpers";
import { Events } from "./types";
import type {
  Asset,
  AudioTrack,
  HlsPlayerEventMap,
  Interstitial,
  Playhead,
  Quality,
  SubtitleTrack,
} from "./types";
import type { EventEmitter } from "tseep";

interface MediaShim {
  currentTime: number;
  duration: number;
}

interface StateParams {
  emitter: EventEmitter<HlsPlayerEventMap>;
  getTiming(): {
    primary?: MediaShim | null;
    asset?: MediaShim | null;
  };
}

interface StateProperties {
  ready: boolean;
  playhead: Playhead;
  started: boolean;
  time: number;
  duration: number;
  interstitial: Interstitial | null;
  qualities: Quality[];
  autoQuality: boolean;
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  volume: number;
  seeking: boolean;
  cuePoints: number[];
}

const noState: StateProperties = {
  playhead: "idle",
  ready: false,
  started: false,
  time: 0,
  duration: NaN,
  interstitial: null,
  qualities: [],
  autoQuality: false,
  audioTracks: [],
  subtitleTracks: [],
  volume: 1,
  seeking: false,
  cuePoints: [],
};

export class State implements StateProperties {
  private timerId_: number | undefined;

  constructor(private params_: StateParams) {
    this.requestTimingSync();
  }

  setReady() {
    if (this.ready) {
      return;
    }
    this.ready = true;
    this.requestTimingSync();
    this.emit_(Events.READY);
  }

  setPlayhead(playhead: Playhead) {
    if (playhead === this.playhead) {
      return;
    }

    this.playhead = playhead;

    if (playhead === "pause") {
      this.requestTimingSync();
    }

    this.emit_(Events.PLAYHEAD_CHANGE);
  }

  setStarted() {
    if (this.started) {
      return;
    }
    this.started = true;
    this.emit_(Events.STARTED);
  }

  setInterstitial(interstitial: Interstitial | null) {
    this.interstitial = interstitial;
    this.emit_(Events.INTERSTITIAL_CHANGE);
  }

  setAsset(asset: Omit<Asset, "time" | "duration"> | null) {
    if (!this.interstitial) {
      return;
    }
    if (asset) {
      this.interstitial.asset = {
        time: 0,
        duration: NaN,
        ...asset,
      };
      this.requestTimingSync();
    } else {
      this.interstitial.asset = null;
    }
  }

  setQualities(qualities: Quality[], autoQuality: boolean) {
    const diff = (items: Quality[]) =>
      items.find((item) => item.active)?.height;

    if (diff(this.qualities) !== diff(qualities)) {
      this.qualities = qualities;
      this.emit_(Events.QUALITIES_CHANGE);
    }

    if (autoQuality !== this.autoQuality) {
      this.autoQuality = autoQuality;
      this.emit_(Events.AUTO_QUALITY_CHANGE);
    }
  }

  setAudioTracks(audioTracks: AudioTrack[]) {
    const diff = (items: AudioTrack[]) => items.find((item) => item.active)?.id;

    if (diff(this.audioTracks) !== diff(audioTracks)) {
      this.audioTracks = audioTracks;
      this.emit_(Events.AUDIO_TRACKS_CHANGE);
    }
  }

  setSubtitleTracks(subtitleTracks: SubtitleTrack[]) {
    const diff = (items: AudioTrack[]) => items.find((item) => item.active)?.id;

    if (
      // TODO: Come up with a generic logical check.
      (!this.subtitleTracks.length && subtitleTracks.length) ||
      diff(this.subtitleTracks) !== diff(subtitleTracks)
    ) {
      this.subtitleTracks = subtitleTracks;
      this.emit_(Events.SUBTITLE_TRACKS_CHANGE);
    }
  }

  setVolume(volume: number) {
    if (volume === this.volume) {
      return;
    }
    this.volume = volume;
    this.emit_(Events.VOLUME_CHANGE);
  }

  setSeeking(seeking: boolean) {
    if (seeking === this.seeking) {
      return;
    }
    this.seeking = seeking;
    this.emit_(Events.SEEKING_CHANGE);
  }

  setCuePoints(cuePoints: number[]) {
    this.cuePoints = cuePoints;
    this.emit_(Events.CUEPOINTS_CHANGE);
  }

  requestTimingSync() {
    clearTimeout(this.timerId_);
    this.timerId_ = window.setTimeout(() => {
      this.requestTimingSync();
    }, 250);

    const timing = this.params_.getTiming();

    let shouldEmit = false;

    if (this.updateTimeDuration_(this, timing.primary)) {
      shouldEmit = true;
    }

    if (
      this.interstitial?.asset &&
      this.updateTimeDuration_(this.interstitial.asset, timing.asset)
    ) {
      shouldEmit = true;
    }

    if (shouldEmit) {
      this.emit_(Events.TIME_CHANGE);
    }
  }

  private updateTimeDuration_(
    target: {
      time: number;
      duration: number;
      seekableStart?: number;
    },
    shim?: MediaShim | null,
  ) {
    if (!shim) {
      return false;
    }
    if (!Number.isFinite(shim.duration)) {
      return false;
    }

    const oldTime = target.time;
    target.time = preciseFloat(shim.currentTime);

    const oldDuration = target.duration;
    target.duration = preciseFloat(shim.duration);

    if (target.time > target.duration) {
      target.time = target.duration;
    }

    return oldTime !== target.time || oldDuration !== target.duration;
  }

  private emit_(event: Events) {
    this.params_.emitter.emit(event);
    this.params_.emitter.emit("*", event);
  }

  ready = noState.ready;
  playhead = noState.playhead;
  started = noState.started;
  time = noState.time;
  duration = noState.duration;
  interstitial = noState.interstitial;
  qualities = noState.qualities;
  autoQuality = noState.autoQuality;
  audioTracks = noState.audioTracks;
  subtitleTracks = noState.subtitleTracks;
  volume = noState.volume;
  seeking = noState.seeking;
  cuePoints = noState.cuePoints;
}

export function getState<N extends keyof StateProperties>(
  state: State | null,
  name: N,
) {
  return state?.[name] ?? noState[name];
}
