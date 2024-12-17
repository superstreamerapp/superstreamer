import { Button, Select, SelectItem } from "@nextui-org/react";
import cn from "clsx";
import { useRef } from "react";
import { usePlayerSelector } from "../context/PlayerContext";
import { useSeekbar } from "../hooks/useSeekbar";
import type { ReactNode, RefObject } from "react";

export function PlayerControls() {
  const ready = usePlayerSelector((player) => player.ready);
  if (!ready) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <div className="flex">
        <PlayButton />
      </div>
      <Seekbar />
      <CuePoints />
      <Time />
      <Tracks />
    </div>
  );
}

function PlayButton() {
  const playOrPause = usePlayerSelector((player) => player.playOrPause);
  const playing = usePlayerSelector(
    (player) => player.playhead === "play" || player.playhead === "playing",
  );

  return (
    <Button isIconOnly onClick={playOrPause}>
      <i className="material-icons">{playing ? "pause" : "play_arrow"}</i>
    </Button>
  );
}

function Seekbar() {
  const seekableStart = usePlayerSelector((player) => player.seekableStart);
  const time = usePlayerSelector((player) => player.time);
  const duration = usePlayerSelector((player) => player.duration);
  const seekTo = usePlayerSelector((player) => player.seekTo);

  const seekbar = useSeekbar({
    min: seekableStart,
    max: duration,
    onSeeked: seekTo,
  });

  const percentage = (time - seekableStart) / (duration - seekableStart);

  return (
    <div {...seekbar.rootProps} className="w-full relative cursor-pointer">
      <Tooltip
        x={seekbar.x}
        seekbarRef={seekbar.rootProps.ref}
        visible={seekbar.active}
      >
        {hms(seekbar.value)}
      </Tooltip>
      <div className="flex items-center rounded-lg overflow-hidden">
        <div className="h-6 bg-gray-100 w-full" />
        <div
          className={cn(
            "h-2 absolute left-0 right-0 bg-gray-200 origin-left opacity-0 transition-opacity",
            seekbar.hover && "opacity-100",
          )}
          style={{
            transform: `scaleX(${seekbar.x})`,
          }}
        />
        <div
          className={cn("h-2 absolute left-0 right-0 bg-black origin-left")}
          style={{
            transform: `scaleX(${percentage})`,
          }}
        />
      </div>
    </div>
  );
}

function Tooltip({
  x,
  seekbarRef,
  visible,
  children,
}: {
  x: number;
  seekbarRef: RefObject<HTMLDivElement>;
  visible: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  if (ref.current && seekbarRef.current) {
    const seekbarRect = seekbarRef.current.getBoundingClientRect();
    const rect = ref.current.getBoundingClientRect();
    const offset = rect.width / 2 / seekbarRect.width;
    if (x < offset) {
      x = offset;
    } else if (x > 1 - offset) {
      x = 1 - offset;
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute h-6 -top-6 -translate-x-1/2 opacity-0 transition-opacity text-xs text-white bg-black px-1 flex items-center rounded-md",
        visible && "opacity-100",
      )}
      style={{ left: `${x * 100}%` }}
    >
      {children}
    </div>
  );
}

function CuePoints() {
  const cuePoints = usePlayerSelector((player) => player.cuePoints);
  const duration = usePlayerSelector((player) => player.duration);
  const seekableStart = usePlayerSelector((player) => player.seekableStart);

  return (
    <div className="relative h-2 bg-gray-100 rounded-lg">
      {cuePoints.map((cuePoint) => {
        return (
          <div
            key={cuePoint}
            style={{
              left: `${((cuePoint - seekableStart) / (duration - seekableStart)) * 100}%`,
            }}
            className="absolute -translate-x-1/2 top-0 w-2 h-2 rounded-full bg-yellow-500"
          >
            <div className="absolute -translate-x-1/2 w-[2px] left-1/2 h-4 bottom-0 bg-yellow-500" />
          </div>
        );
      })}
    </div>
  );
}

function Time() {
  const seekableStart = usePlayerSelector((player) => player.seekableStart);
  const duration = usePlayerSelector((player) => player.duration);

  return (
    <div className="flex">
      {hms(seekableStart)}
      <div className="grow" />
      {hms(duration)}
    </div>
  );
}

function Tracks() {
  const audioTracks = usePlayerSelector((player) => player.audioTracks);
  const setAudioTrack = usePlayerSelector((player) => player.setAudioTrack);
  const audioKey = audioTracks.find((track) => track.active)?.id.toString();

  const subtitleTracks = usePlayerSelector((player) => player.subtitleTracks);
  const setSubtitleTrack = usePlayerSelector(
    (player) => player.setSubtitleTrack,
  );
  const subtitleKey = subtitleTracks
    .find((track) => track.active)
    ?.id.toString();

  return (
    <div className="flex gap-4">
      <Select
        label="Audio"
        items={audioTracks}
        selectionMode="single"
        selectedKeys={audioKey ? [audioKey] : []}
        onChange={(event) => {
          const id = Number.parseInt(event.target.value);
          if (Number.isNaN(id)) {
            return;
          }
          setAudioTrack(id);
        }}
      >
        {(track) => <SelectItem key={track.id}>{track.label}</SelectItem>}
      </Select>

      <Select
        label="Subtitles"
        items={subtitleTracks}
        selectionMode="single"
        selectedKeys={subtitleKey ? [subtitleKey] : []}
        onChange={(event) => {
          const id = Number.parseInt(event.target.value);
          if (Number.isNaN(id)) {
            return;
          }
          setSubtitleTrack(id);
        }}
      >
        {(track) => <SelectItem key={track.id}>{track.label}</SelectItem>}
      </Select>
    </div>
  );
}

function hms(seconds: number) {
  return (
    new Date(seconds * 1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)?.[0] ??
    "00:00:00"
  );
}
