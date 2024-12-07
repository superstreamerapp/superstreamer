import Hls from "hls.js";
import { assert } from "shared/assert";
import { EventEmitter } from "tseep";
import { EventManager } from "./event-manager";
import { formatListAsset, getLangCode } from "./helpers";
import { getState, State } from "./state";
import type {
  AudioTrack,
  HlsPlayerEventMap,
  Quality,
  SubtitleTrack,
} from "./types";
import type { Level } from "hls.js";

export interface HlsPlayerOptions {
  multiMediaEl?: boolean;
}

export class HlsPlayer {
  private primaryMedia_: HTMLMediaElement;

  private assetMedias_: HTMLMediaElement[] = [];

  private assetMediaIndex_ = 0;

  private eventManager_ = new EventManager();

  private activeMedia_: HTMLMediaElement;

  private activeMediaEventManager_ = new EventManager();

  private hls_: Hls | null = null;

  private state_: State | null = null;

  private emitter_ = new EventEmitter<HlsPlayerEventMap>();

  constructor(
    public container: HTMLDivElement,
    userOptions?: HlsPlayerOptions,
  ) {
    const options = {
      ...userOptions,
      multiMediaEl: true,
    };

    this.primaryMedia_ = this.activeMedia_ = this.createMedia_();

    if (options.multiMediaEl) {
      // Create separate media elements for interstitial assets. This is to ensure a smoother
      // transition across different playlists.
      this.assetMedias_ = [this.createMedia_(), this.createMedia_()];
    }

    // Make sure we're in unload state.
    this.unload();
  }

  private createMedia_() {
    const media = document.createElement("video");
    this.container.appendChild(media);

    media.style.position = "absolute";
    media.style.inset = "0";
    media.style.width = "100%";
    media.style.height = "100%";

    return media;
  }

  load(url: string) {
    const hls = this.createHls_();

    this.state_ = new State({
      emitter: this.emitter_,
      getTiming: () => hls.interstitialsManager?.primary ?? hls.media ?? null,
      getAssetTiming: () => {
        if (!hls.interstitialsManager) {
          return null;
        }
        return (
          hls.interstitialsManager.playerQueue.find(
            (player) =>
              player.assetItem === hls.interstitialsManager?.playingAsset,
          ) ?? null
        );
      },
    });

    hls.attachMedia(this.primaryMedia_);
    hls.loadSource(url);

    this.hls_ = hls;
  }

  unload() {
    this.eventManager_.removeAll();
    this.state_ = null;

    this.setActiveMedia_(this.primaryMedia_);

    if (this.hls_) {
      this.hls_.destroy();
      this.hls_ = null;
    }
  }

  destroy() {
    this.emitter_.removeAllListeners();
    this.unload();

    this.allMedias_.forEach((media) => {
      media.remove();
    });
  }

  on = this.emitter_.on.bind(this.emitter_);
  off = this.emitter_.off.bind(this.emitter_);
  once = this.emitter_.once.bind(this.emitter_);

  playOrPause() {
    if (!this.state_) {
      return;
    }
    const shouldPause =
      this.state_.playhead === "play" || this.state_.playhead === "playing";
    if (shouldPause) {
      this.activeMedia_.pause();
    } else {
      this.activeMedia_.play();
    }
  }

  seekTo(time: number) {
    assert(this.hls_);

    if (this.hls_.interstitialsManager) {
      this.hls_.interstitialsManager.primary.seekTo(time);
    } else {
      this.primaryMedia_.currentTime = time;
    }
  }

  setQuality(height: number | null) {
    assert(this.hls_);

    if (height === null) {
      this.hls_.nextLevel = -1;
    } else {
      const loadLevel = this.hls_.levels[this.hls_.loadLevel];
      assert(loadLevel, "No level found for loadLevel index");

      const idx = this.hls_.levels.findIndex((level) => {
        return (
          level.height === height &&
          level.audioCodec?.substring(0, 4) ===
            loadLevel.audioCodec?.substring(0, 4)
        );
      });

      if (idx < 0) {
        throw new Error("Could not find matching level");
      }

      this.hls_.nextLevel = idx;
    }

    this.updateQualities_();
  }

  setAudioTrack(id: number) {
    assert(this.hls_);

    const audioTrack = this.state_?.audioTracks.find(
      (track) => track.id === id,
    );
    assert(audioTrack);

    this.hls_.setAudioOption({
      lang: audioTrack.track.lang,
      channels: audioTrack.track.channels,
      name: audioTrack.track.name,
    });
  }

  setSubtitleTrack(id: number) {
    assert(this.hls_);

    const subtitleTrack = this.state_?.subtitleTracks.find(
      (track) => track.id === id,
    );
    assert(subtitleTrack);

    this.hls_.setSubtitleOption({
      lang: subtitleTrack.track.lang,
      name: subtitleTrack.track.name,
    });
  }

  setVolume(volume: number) {
    this.allMedias_.forEach((media) => {
      media.volume = volume;
      media.muted = volume === 0;
    });
    this.state_?.setVolume(volume);
  }

  get ready() {
    return getState(this.state_, "ready");
  }

  get playhead() {
    return getState(this.state_, "playhead");
  }

  get started() {
    return getState(this.state_, "started");
  }

  get time() {
    return getState(this.state_, "time");
  }

  get duration() {
    return getState(this.state_, "duration");
  }

  get asset() {
    return getState(this.state_, "asset");
  }

  get qualities() {
    return getState(this.state_, "qualities");
  }

  get autoQuality() {
    return getState(this.state_, "autoQuality");
  }

  get audioTracks() {
    return getState(this.state_, "audioTracks");
  }

  get subtitleTracks() {
    return getState(this.state_, "subtitleTracks");
  }

  get volume() {
    return getState(this.state_, "volume");
  }

  get cuepoints() {
    return getState(this.state_, "cuepoints");
  }

  private createHls_() {
    const hls = new Hls();

    const listen = this.eventManager_.listen(hls);

    listen(Hls.Events.MANIFEST_LOADED, () => {
      this.updateQualities_();
      this.updateAudioTracks_();
      this.updateSubtitleTracks_();
    });

    listen(Hls.Events.INTERSTITIAL_ASSET_STARTED, (_, data) => {
      const media = this.claimAssetMedia_();
      if (media) {
        data.player.attachMedia(media);
        this.setActiveMedia_(media);
      }

      const listResponseAsset =
        data.event.assetListResponse?.ASSETS[data.assetListIndex];
      const assetData = formatListAsset(listResponseAsset);

      this.state_?.setAsset({
        player: data.player,
        type: assetData.type,
      });
    });

    listen(Hls.Events.INTERSTITIAL_ASSET_ENDED, () => {
      this.state_?.setAsset(null);
    });

    listen(Hls.Events.INTERSTITIALS_PRIMARY_RESUMED, () => {
      this.assetMediaIndex_ = 0;
      this.setActiveMedia_(this.primaryMedia_);
    });

    listen(Hls.Events.LEVELS_UPDATED, () => {
      this.updateQualities_();
    });

    listen(Hls.Events.LEVEL_SWITCHING, () => {
      this.updateQualities_();
    });

    listen(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
      this.updateAudioTracks_();
    });

    listen(Hls.Events.AUDIO_TRACK_SWITCHING, () => {
      this.updateAudioTracks_();
    });

    listen(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
      this.updateSubtitleTracks_();
    });

    listen(Hls.Events.SUBTITLE_TRACK_SWITCH, () => {
      this.updateSubtitleTracks_();
    });

    listen(Hls.Events.INTERSTITIALS_UPDATED, (_, data) => {
      const cuepoints: number[] = [];
      data.schedule.forEach((item) => {
        const tags = item.event?.dateRange.attr.enumeratedStringList(
          "X-SPRS-TYPES",
          { ad: false, bumper: false },
        );
        if (tags?.ad) {
          cuepoints.push(item.start);
        }
      });
      this.state_?.setCuepoints(cuepoints);
    });

    return hls;
  }

  private claimAssetMedia_() {
    if (!this.assetMedias_.length) {
      return null;
    }

    const media = this.assetMedias_[this.assetMediaIndex_];
    this.assetMediaIndex_ =
      (this.assetMediaIndex_ + 1) % this.assetMedias_.length;

    return media;
  }

  private setActiveMedia_(media: HTMLMediaElement) {
    this.allMedias_.forEach((element) => {
      element.style.opacity = element === media ? "1" : "0";
    });

    this.activeMedia_ = media;

    this.activeMediaEventManager_.removeAll();
    const listen = this.activeMediaEventManager_.listen(media);

    listen("canplay", () => {
      this.state_?.setReady();
    });

    listen("play", () => {
      this.state_?.setPlayhead("play");
    });

    listen("playing", () => {
      this.state_?.setStarted();

      this.state_?.setPlayhead("playing");
    });

    listen("pause", () => {
      this.state_?.setPlayhead("pause");
    });

    listen("volumechange", () => {
      this.state_?.setVolume(media.volume);
    });
  }

  private get allMedias_() {
    return [this.primaryMedia_, ...this.assetMedias_];
  }

  private updateQualities_() {
    assert(this.hls_);

    const group: {
      height: number;
      levels: Level[];
    }[] = [];

    for (const level of this.hls_.levels) {
      let item = group.find((item) => item.height === level.height);
      if (!item) {
        item = {
          height: level.height,
          levels: [],
        };
        group.push(item);
      }
      item.levels.push(level);
    }

    const level = this.hls_.levels[this.hls_.nextLoadLevel];

    const qualities = group.map<Quality>((item) => {
      return {
        ...item,
        active: item.height === level.height,
      };
    });

    qualities.sort((a, b) => b.height - a.height);

    const autoQuality = this.hls_.autoLevelEnabled;
    this.state_?.setQualities(qualities, autoQuality);
  }

  private updateAudioTracks_() {
    assert(this.hls_);

    const tracks = this.hls_.allAudioTracks.map<AudioTrack>((track, index) => {
      let label = getLangCode(track.lang);
      if (track.channels === "6") {
        label += " 5.1";
      }
      return {
        id: index,
        active: this.hls_?.audioTracks.includes(track)
          ? track.id === this.hls_.audioTrack
          : false,
        label,
        track,
      };
    });

    this.state_?.setAudioTracks(tracks);
  }

  private updateSubtitleTracks_() {
    assert(this.hls_);

    const tracks = this.hls_.allSubtitleTracks.map<SubtitleTrack>(
      (track, index) => {
        return {
          id: index,
          active: this.hls_?.subtitleTracks.includes(track)
            ? track.id === this.hls_.subtitleTrack
            : false,
          label: getLangCode(track.lang),
          track,
        };
      },
    );

    this.state_?.setSubtitleTracks(tracks);
  }
}
