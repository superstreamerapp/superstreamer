import { Card } from "@nextui-org/react";
import type { ReactNode } from "react";

interface ScrollCardProps {
  children: ReactNode;
}

export function ScrollCard({ children }: ScrollCardProps) {
  return (
    <Card className="relative h-full">
      <div className="absolute inset-0 overflow-y-auto p-4">{children}</div>
    </Card>
  );
}
