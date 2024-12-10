import type { ReactNode } from "react";

type Data = string | number | object | null | undefined;

interface ObjectDumpProps {
  name?: string | number;
  data: Data | Data[];
  parent?: string;
  redacted?: string[];
}

export function ObjectDump({ name, data, parent, redacted }: ObjectDumpProps) {
  const id = `${parent}.${name}`;

  for (const check of redacted ?? []) {
    if (id.includes(check)) {
      return null;
    }
  }

  if (Array.isArray(data)) {
    return (
      <div className="ml-2">
        <Label name={name} />
        {"["}
        {data.map((child, index) => (
          <ObjectDump
            key={`${id}.${index}`}
            parent={`${id}.${index}`}
            name={index}
            data={child}
            redacted={redacted}
          />
        ))}
        {"]"}
      </div>
    );
  }
  if (typeof data === "object" && data) {
    return (
      <div className="ml-2">
        <Label name={name} />
        {"{"}
        {Object.entries(data).map(([name, value]) => {
          return (
            <ObjectDump
              key={`${id}.${name}`}
              parent={`${id}.${name}`}
              name={name}
              data={value}
              redacted={redacted}
            />
          );
        })}
        {"}"}
      </div>
    );
  }
  if (data !== Object(data)) {
    return <Primitive name={name ?? ""} value={data} />;
  }
  return null;
}

function Primitive({ name, value }: { name: string | number; value: Data }) {
  let className = "";
  let child: ReactNode = String(value);
  if (value === undefined || value === null) {
    className = "opacity-50";
  } else if (typeof value === "number") {
    if (Number.isNaN(value)) {
      className = "text-red-500";
    } else if (Number.isInteger(value)) {
      className = "text-blue-700";
    } else {
      className = "text-pink-700";
    }
  } else if (typeof value === "string") {
    className = "text-purple-500";
    child = `"${value}"`;
  } else if (typeof value === "boolean") {
    className = "text-amber-600";
  }

  return (
    <div className="ml-2">
      <Label name={name.toString()} />
      <span className={className}>{child}</span>
    </div>
  );
}

function Label({ name }: { name?: string | number }) {
  if (name === undefined) {
    return "";
  }
  return (
    <>
      <span className="opacity-70">{name}</span>:{" "}
    </>
  );
}
