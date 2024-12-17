import { useEffect, useState } from "react";
import { DataView } from "./DataView";
import { usePlayer } from "../context/PlayerContext";

export function PlayerStats() {
  const { player } = usePlayer();
  const [state, setState] = useState({});

  useEffect(() => {
    if (!player) {
      return;
    }

    const onUpdate = () => {
      const state = extractPublicProps(player);
      setState(state);
    };

    player.on("*", onUpdate);
    onUpdate();

    return () => {
      player.off("*", onUpdate);
    };
  }, [player]);

  return (
    <DataView
      redacted={[
        "subtitleTracks.*.track",
        "audioTracks.*.track",
        "qualities.*.levels",
      ]}
      data={state}
    />
  );
}

function extractPublicProps(value: object) {
  if (!("__proto__" in value)) {
    return {};
  }

  const descriptors = Object.entries(
    Object.getOwnPropertyDescriptors(value.__proto__),
  );

  const state = descriptors
    // Get public getters only
    .filter(([name, desc]) => !name.endsWith("_") && desc.get)
    .map(([name]) => name)
    // Grab each property by name and add it to an object
    .reduce((acc, name) => {
      // @ts-expect-error Named properties
      acc[name] = player[name];
      return acc;
    }, {});

  return state;
}
