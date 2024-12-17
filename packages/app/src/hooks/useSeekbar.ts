import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export function useSeekbar({
  min,
  max,
  onSeeked,
}: {
  min: number;
  max: number;
  onSeeked: (value: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const len = max - min;

  const [hover, setHover] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [x, setX] = useState(0);

  const active = hover || seeking;
  const value = min + x * len;

  const setPercentage = (event: PointerEvent | React.PointerEvent) => {
    if (!ref.current) {
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    let x = (event.clientX - rect.left) / rect.width;
    if (x < 0) {
      x = 0;
    } else if (x > 1) {
      x = 1;
    }

    setX(x);
  };

  useEffect(() => {
    document.body.style.userSelect = seeking ? "none" : "";
  }, [seeking]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      setPercentage(event);
    };

    const onPointerUp = (event: PointerEvent) => {
      flushSync(() => {
        setPercentage(event);
        setSeeking(false);
      });
      onSeeked(value);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [active, window, value]);

  const rootProps = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onPointerDown: (event: React.PointerEvent) => {
      setPercentage(event);
      setSeeking(true);
    },
    ref,
  };

  return {
    rootProps,
    hover,
    seeking,
    value,
    active,
    x,
  };
}
