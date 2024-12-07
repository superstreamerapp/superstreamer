import { Events, HlsPlayer } from "@superstreamer/player";
import { MediaTracksMixin } from "media-tracks";

function getTemplateHTML() {
  return `
    <style>
      :host {
        width: 100%;
        height: 100%;
      }
    </style>
    <div class="container"></div>
  `;
}

class SuperstreamerVideoElement extends MediaTracksMixin(
  globalThis.HTMLElement,
) {
  static getTemplateHTML = getTemplateHTML;

  static shadowRootOptions = {
    mode: "open",
  };

  static observedAttributes = ["src"];

  #player;

  #readyState = 0;

  get src() {
    return this.getAttribute("src");
  }

  set src(val) {
    if (this.src === val) {
      return;
    }
    this.setAttribute("src", val);
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    if (attrName === "src" && oldValue !== newValue) {
      this.load();
    }
  }

  load() {
    if (!this.shadowRoot) {
      this.attachShadow({
        mode: "open",
      });
      this.shadowRoot.innerHTML = getTemplateHTML();
    }

    this.#readyState = 0;
    this.dispatchEvent(new Event("emptied"));

    if (!this.#player) {
      const container = this.shadowRoot.querySelector(".container");
      const player = (this.#player = new HlsPlayer(container));

      player.on(Events.PLAYHEAD_CHANGE, () => {
        switch (player.playhead) {
          case "play":
            this.dispatchEvent(new Event("play"));
            break;
          case "playing":
            this.dispatchEvent(new Event("playing"));
            break;
          case "pause":
            this.dispatchEvent(new Event("pause"));
            break;
        }
      });

      player.on(Events.TIME_CHANGE, () => {
        this.dispatchEvent(new Event("timeupdate"));
      });

      player.on(Events.VOLUME_CHANGE, () => {
        this.dispatchEvent(new Event("volumechange"));
      });

      player.on(Events.READY, () => {
        this.dispatchEvent(new Event("loadedmetadata"));
        this.dispatchEvent(new Event("durationchange"));
        this.dispatchEvent(new Event("loadcomplete"));

        this.#createVideoTracks();
        this.#createAudioTracks();

        this.#readyState = 1;
      });

      player.on(Events.STARTED, () => {
        this.#readyState = 3;
      });
    }

    this.#player.load(this.src);

    // TODO: Remove this.
    Object.assign(window, {
      player: this.#player,
    });
  }

  get currentTime() {
    return this.#player.time;
  }

  set currentTime(val) {
    this.#player.seekTo(val);
  }

  get duration() {
    return this.#player.duration;
  }

  get paused() {
    const { playhead } = this.#player;
    if (playhead === "play" || playhead === "playing") {
      return false;
    }
    return true;
  }

  get readyState() {
    return this.#readyState;
  }

  get muted() {
    return this.#player.volume === 0;
  }

  set muted(val) {
    this.#player.setVolume(val ? 0 : 1);
  }

  get volume() {
    return this.#player.volume;
  }

  set volume(val) {
    this.#player.setVolume(val);
  }

  async play() {
    this.#player.playOrPause();
  }

  pause() {
    this.#player.playOrPause();
  }

  #createVideoTracks() {
    let videoTrack = this.videoTracks.getTrackById("main");

    if (!videoTrack) {
      videoTrack = this.addVideoTrack("main");
      videoTrack.id = "main";
      videoTrack.selected = true;
    }

    this.#player.qualities.forEach((quality) => {
      const videoRendition = videoTrack.addRendition(
        undefined,
        quality.height,
        quality.height,
        undefined,
        undefined,
      );
      videoRendition.id = quality.height;
    });

    this.videoRenditions.addEventListener("change", (event) => {
      if (event.target.selectedIndex < 0) {
        this.#player.setQuality(null);
      } else {
        const rendition = this.videoRenditions[event.target.selectedIndex];
        this.#player.setQuality(rendition.height);
      }
    });
  }

  #createAudioTracks() {
    this.#player.audioTracks.forEach((a) => {
      const audioTrack = this.addAudioTrack("main", a.label, a.label);
      audioTrack.id = a.id;
      audioTrack.enabled = a.active;
    });

    this.audioTracks.addEventListener("change", () => {
      const id = [...this.audioTracks].find((a) => a.enabled)?.id;
      this.#player.setAudioTrack(id);
    });
  }
}

if (!globalThis.customElements?.get("superstreamer-video")) {
  globalThis.customElements.define(
    "superstreamer-video",
    SuperstreamerVideoElement,
  );
}

export default SuperstreamerVideoElement;
