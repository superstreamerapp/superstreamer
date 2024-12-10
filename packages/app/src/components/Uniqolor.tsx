import uniqolor from "uniqolor";

interface UniqolorProps {
  value: string;
}

export function Uniqolor({ value }: UniqolorProps) {
  let { color } = uniqolor(value, {});

  if (value === "default") {
    color = "#cccccc";
  }

  return (
    <span
      className="text-[0.7rem] rounded-md h-5 px-2 font-medium leading-none inline-flex items-center"
      style={{ color, backgroundColor: hexToRGB(color, 0.25) }}
    >
      {value}
    </span>
  );
}

function hexToRGB(hex: string, alpha: number) {
  return (
    "rgba(" +
    Number.parseInt(hex.slice(1, 3), 16) +
    ", " +
    Number.parseInt(hex.slice(3, 5), 16) +
    ", " +
    Number.parseInt(hex.slice(5, 7), 16) +
    ", " +
    alpha +
    ")"
  );
}
