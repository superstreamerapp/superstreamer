import Hls from "hls.js";
import { assert } from "shared/assert";
import { EventEmitter } from "tseep";
import { EventManager } from "./event-manager";
import { getLangCode } from "./helpers";
import { getState, State } from "./state";
import type {
  AudioTrack,
  HlsPlayerEventMap,
  Quality,
  SubtitleTrack,
} from "./types";
import type { Level } from "hls.js";

export class HlsPlayer {
  private media_: HTMLMediaElement;

  private eventManager_ = new EventManager();

  private hls_: Hls | null = null;

  private state_: State | null = null;

  private emitter_ = new EventEmitter<HlsPlayerEventMap>();

  constructor(public container: HTMLDivElement) {
    this.media_ = this.createMedia_();

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
    this.bindMediaListeners_();
    const hls = this.createHls_();

    this.state_ = new State({
      emitter: this.emitter_,
      getTiming: () => ({
        primary: hls.interstitialsManager?.primary ?? hls.media,
        asset: hls.interstitialsManager?.playerQueue.find(
          (player) =>
            player.assetItem === hls.interstitialsManager?.playingAsset,
        ),
      }),
    });

    hls.attachMedia(this.media_);
    hls.loadSource(url);

    this.hls_ = hls;
  }

  unload() {
    this.eventManager_.removeAll();
    this.state_ = null;

    if (this.hls_) {
      this.hls_.destroy();
      this.hls_ = null;
    }
  }

  destroy() {
    this.emitter_.removeAllListeners();
    this.unload();
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
      this.media_.pause();
    } else {
      this.media_.play();
    }
  }

  seekTo(time: number) {
    assert(this.hls_);

    if (this.hls_.interstitialsManager) {
      this.hls_.interstitialsManager.primary.seekTo(time);
    } else {
      this.media_.currentTime = time;
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

  setSubtitleTrack(id: number | null) {
    assert(this.hls_);

    if (id === null) {
      this.hls_.subtitleTrack = -1;
      return;
    }

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
    this.media_.volume = volume;
    this.media_.muted = volume === 0;
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

  get seeking() {
    return getState(this.state_, "seeking");
  }

  get interstitial() {
    return getState(this.state_, "interstitial");
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

  get seekableStart() {
    if (this.hls_) {
      return this.hls_.interstitialsManager?.primary?.seekableStart ?? 0;
    }
    return NaN;
  }

  get live() {
    return this.hls_?.levels[this.hls_.currentLevel]?.details?.live ?? false;
  }

  get cuePoints() {
    return getState(this.state_, "cuePoints");
  }

  private createHls_() {
    const hls = new Hls();

    const listen = this.eventManager_.listen(hls);

    listen(Hls.Events.MANIFEST_LOADED, () => {
      this.updateQualities_();
      this.updateAudioTracks_();
      this.updateSubtitleTracks_();
    });

    listen(Hls.Events.INTERSTITIAL_STARTED, () => {
      this.state_?.setInterstitial({
        asset: null,
      });
    });

    listen(Hls.Events.INTERSTITIAL_ASSET_STARTED, (_, data) => {
      const listResponseAsset = data.event.assetListResponse?.ASSETS[
        data.assetListIndex
      ] as {
        "SPRS-KIND"?: "ad" | "bumper";
      };

      this.state_?.setAsset({
        type: listResponseAsset["SPRS-KIND"],
      });
    });

    listen(Hls.Events.INTERSTITIAL_ASSET_ENDED, () => {
      this.state_?.setAsset(null);
    });

    listen(Hls.Events.INTERSTITIAL_ENDED, () => {
      this.state_?.setInterstitial(null);
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
      const cuePoints = data.schedule.reduce<number[]>((acc, item) => {
        if (item.event) {
          acc.push(item.start);
        }
        return acc;
      }, []);
      this.state_?.setCuePoints(cuePoints);
    });

    return hls;
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

  private bindMediaListeners_() {
    const listen = this.eventManager_.listen(this.media_);

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
      this.state_?.setVolume(this.media_.volume);
    });

    listen("seeking", () => {
      this.state_?.setSeeking(true);
    });

    listen("seeked", () => {
      this.state_?.setSeeking(false);
    });
  }
}
