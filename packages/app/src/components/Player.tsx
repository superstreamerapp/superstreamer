import { HlsPlayer } from "@superstreamer/player";
import { useEffect, useRef, useState } from "react";

interface PlayerProps {
  url?: string | null;
}

export function Player({ url }: PlayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<HlsPlayer | null>(null);

  useEffect(() => {
    const player = new HlsPlayer(ref.current!);
    Object.assign(window, { player });
    setPlayer(player);
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
