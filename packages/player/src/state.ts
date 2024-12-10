import { preciseFloat } from "./helpers";
import { Events } from "./types";
import type {
  Asset,
  AudioTrack,
  HlsPlayerEventMap,
  Playhead,
  Quality,
  SubtitleTrack,
} from "./types";
import type { EventEmitter } from "tseep";

interface StateMediaShim {
  currentTime: number;
  duration: number;
}

interface StateParams {
  emitter: EventEmitter<HlsPlayerEventMap>;
  getTiming(): StateMediaShim | null;
  getAssetTiming(): StateMediaShim | null;
}

interface StateProperties {
  ready: boolean;
  playhead: Playhead;
  started: boolean;
  time: number;
  duration: number;
  asset: Asset | null;
  qualities: Quality[];
  autoQuality: boolean;
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  volume: number;
  seeking: boolean;
}

const noState: StateProperties = {
  playhead: "idle",
  ready: false,
  started: false,
  time: 0,
  duration: NaN,
  asset: null,
  qualities: [],
  autoQuality: false,
  audioTracks: [],
  subtitleTracks: [],
  volume: 1,
  seeking: false,
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

  setAsset(asset: Omit<Asset, "time" | "duration"> | null) {
    if (asset) {
      this.asset = {
        time: 0,
        duration: NaN,
        ...asset,
      };
      this.requestTimingSync();
    } else {
      this.asset = null;
    }
    this.emit_(Events.ASSET_CHANGE);
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

  requestTimingSync() {
    clearTimeout(this.timerId_);
    this.timerId_ = window.setTimeout(() => {
      this.requestTimingSync();
    }, 250);

    if (this.updateTimeDuration_(this, this.params_.getTiming())) {
      this.emit_(Events.TIME_CHANGE);
    }

    if (this.asset) {
      if (this.updateTimeDuration_(this.asset, this.params_.getAssetTiming())) {
        this.emit_(Events.ASSET_TIME_CHANGE);
      }
    }
  }

  private updateTimeDuration_(
    target: {
      time: number;
      duration: number;
    },
    timing: StateMediaShim | null,
  ) {
    if (!timing) {
      return false;
    }
    if (!Number.isFinite(timing.duration)) {
      return false;
    }

    const oldTime = target.time;
    target.time = preciseFloat(timing.currentTime);

    const oldDuration = target.duration;
    target.duration = preciseFloat(timing.duration);

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
  asset = noState.asset;
  qualities = noState.qualities;
  autoQuality = noState.autoQuality;
  audioTracks = noState.audioTracks;
  subtitleTracks = noState.subtitleTracks;
  volume = noState.volume;
  seeking = noState.seeking;
}

export function getState<N extends keyof StateProperties>(
  state: State | null,
  name: N,
) {
  return state?.[name] ?? noState[name];
}
