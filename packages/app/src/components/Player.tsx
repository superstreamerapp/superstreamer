import { HlsPlayer } from "@superstreamer/player";
import { useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";

interface PlayerProps {
  url: string;
}

export function Player({ url }: PlayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { player, setPlayer } = usePlayer();

  useEffect(() => {
    const player = new HlsPlayer(ref.current!);
    setPlayer(player);

    return () => {
      setPlayer(null);
      player.destroy();
    };
  }, []);

  useEffect(() => {
    if (!player || !url) {
      return;
    }
    player.load(url);
    return () => {
      player.unload();
    };
  }, [player, url]);

  return <div className="relative aspect-video bg-black" ref={ref} />;
}
