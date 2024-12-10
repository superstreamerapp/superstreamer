import { Card } from "@nextui-org/react";
import { HlsPlayer } from "@superstreamer/player";
import { useEffect, useRef, useState } from "react";
import { ObjectDump } from "./ObjectDump";

interface PlayerProps {
  url?: string | null;
}

export function Player({ url }: PlayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<HlsPlayer | null>(null);
  const [state, setState] = useState<object>({});

  useEffect(() => {
    const player = new HlsPlayer(ref.current!);
    Object.assign(window, { player });

    player.on("*", () => {
      const obj = {};
      Object.entries(
        Object.getOwnPropertyDescriptors(HlsPlayer.prototype),
      ).forEach(([key, descriptor]) => {
        if (descriptor.get && !key.endsWith("_")) {
          // @ts-expect-error Sanity checked getter
          obj[key] = player[key];
        }
      });
      setState(obj);
    });

    setPlayer(player);

    return () => {
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

  return (
    <div className="flex flex-col grow gap-4 h-full">
      <div className="flex items-center">
        <div
          className="relative aspect-video bg-black max-h-[300px] grow"
          ref={ref}
        />
      </div>
      <Card className="grow w-full h-full p-4 text-sm overflow-y-auto">
        <ObjectDump
          data={state}
          redacted={["levels", ".track", "asset.player"]}
        />
      </Card>
    </div>
  );
}
