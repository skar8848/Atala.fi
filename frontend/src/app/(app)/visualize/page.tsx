"use client";

import dynamic from "next/dynamic";

const CanvasPage = dynamic(
  () => import("@/components/canvas/CanvasPage"),
  { ssr: false }
);

export default function VisualizePage() {
  return <CanvasPage />;
}
