"use client";

import { memo, useState } from "react";
import {
  getBezierPath,
  type EdgeProps,
  useReactFlow,
} from "@xyflow/react";

function AnimatedEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const color = hovered ? "#a78bfa" : "oklch(0.556 0 0)";

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={hovered ? 2.5 : 1.5}
        strokeDasharray="6 4"
        style={{
          animation: "dash-flow 1s linear infinite",
          transition: "stroke 0.2s, stroke-width 0.2s",
          filter: hovered ? "drop-shadow(0 0 4px rgba(167,139,250,0.5))" : "none",
        }}
      />
      {hovered && (
        <foreignObject
          x={labelX - 10}
          y={labelY - 10}
          width={20}
          height={20}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <button
            onClick={() => setEdges((eds) => eds.filter((e) => e.id !== id))}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "oklch(0.704 0.191 22.216)",
              color: "#fff",
              border: "none",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            x
          </button>
        </foreignObject>
      )}
    </g>
  );
}

export const AnimatedEdge = memo(AnimatedEdgeInner);
