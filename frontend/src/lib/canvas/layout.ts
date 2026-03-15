import type { Edge } from "@xyflow/react";
import type { CanvasNode } from "./types";

const ROW_SPACING = 200;
const START_Y = 80;
const COL_GAP = 100;
const ROW_GAP_MIN = 40;

/**
 * Build initial canvas layout with just a wallet node.
 */
export function buildInitialLayout(address: string | undefined): CanvasNode[] {
  return [
    {
      id: "wallet-1",
      type: "walletNode",
      position: { x: 50, y: START_Y },
      data: {
        type: "wallet",
        address,
        balances: [],
      },
    },
  ];
}

/**
 * Auto-organize nodes into a clean tree layout.
 * BFS depth assignment, forward pass Y positioning, overlap resolution.
 */
export function organizeLayout(
  nodes: CanvasNode[],
  edges: Edge[],
  nodeSizes?: Map<string, { w: number; h: number }>
): CanvasNode[] {
  if (nodes.length === 0) return nodes;

  // Adjacency
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const n of nodes) {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  }
  for (const e of edges) {
    if (!incoming.has(e.target) || !outgoing.has(e.source)) continue;
    incoming.get(e.target)!.push(e.source);
    outgoing.get(e.source)!.push(e.target);
  }

  // Depth (BFS, max depth wins)
  const depth = new Map<string, number>();
  const queue: string[] = [];
  const roots = nodes.filter((n) => incoming.get(n.id)!.length === 0);

  if (roots.length === 0) {
    for (const n of nodes) { depth.set(n.id, 0); queue.push(n.id); }
  } else {
    for (const r of roots) { depth.set(r.id, 0); queue.push(r.id); }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = depth.get(id)!;
    for (const t of outgoing.get(id) ?? []) {
      if (!depth.has(t) || d + 1 > depth.get(t)!) {
        depth.set(t, d + 1);
        queue.push(t);
      }
    }
  }
  for (const n of nodes) { if (!depth.has(n.id)) depth.set(n.id, 0); }

  // Group by column
  const columns = new Map<number, string[]>();
  for (const n of nodes) {
    const col = depth.get(n.id)!;
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col)!.push(n.id);
  }
  const sortedCols = [...columns.keys()].sort((a, b) => a - b);

  const getW = (id: string) => nodeSizes?.get(id)?.w ?? 280;
  const getH = (id: string) => nodeSizes?.get(id)?.h ?? 200;

  // Forward pass: Y positions
  const yPos = new Map<string, number>();

  for (const col of sortedCols) {
    const ids = columns.get(col)!;
    const desired = new Map<string, number>();
    for (const id of ids) {
      const sources = incoming.get(id)!;
      const ys = sources.map((s) => yPos.get(s)).filter((y): y is number => y !== undefined);
      desired.set(id, ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : 0);
    }
    ids.sort((a, b) => (desired.get(a) ?? 0) - (desired.get(b) ?? 0));
    for (const id of ids) yPos.set(id, desired.get(id) ?? 0);
    spreadAndCenter(ids, yPos, getH);
  }

  // Center roots on children
  if (sortedCols.length > 0) {
    const rootIds = columns.get(sortedCols[0])!;
    for (const id of rootIds) {
      const children = outgoing.get(id)!;
      const childYs = children.map((c) => yPos.get(c)).filter((y): y is number => y !== undefined);
      if (childYs.length > 0) {
        yPos.set(id, childYs.reduce((a, b) => a + b, 0) / childYs.length);
      }
    }
    rootIds.sort((a, b) => yPos.get(a)! - yPos.get(b)!);
    spreadAndCenter(rootIds, yPos, getH);
  }

  // Column X positions
  const colMaxWidth = new Map<number, number>();
  for (const col of sortedCols) {
    let maxW = 0;
    for (const id of columns.get(col)!) maxW = Math.max(maxW, getW(id));
    colMaxWidth.set(col, maxW);
  }
  const colX = new Map<number, number>();
  let curX = 80;
  for (const col of sortedCols) {
    colX.set(col, curX);
    curX += colMaxWidth.get(col)! + COL_GAP;
  }

  // Normalize Y
  let minY = Infinity;
  for (const y of yPos.values()) minY = Math.min(minY, y);
  const offsetY = 80 - minY;

  return nodes.map((n) => ({
    ...n,
    position: {
      x: colX.get(depth.get(n.id) ?? 0) ?? 80,
      y: (yPos.get(n.id) ?? 0) + offsetY,
    },
  }));
}

function spreadAndCenter(
  ids: string[],
  yPos: Map<string, number>,
  getH: (id: string) => number
) {
  if (ids.length <= 1) return;
  const centroid = ids.reduce((s, id) => s + yPos.get(id)!, 0) / ids.length;
  for (let i = 1; i < ids.length; i++) {
    const prevY = yPos.get(ids[i - 1])!;
    const prevH = getH(ids[i - 1]);
    const minY = prevY + prevH + ROW_GAP_MIN;
    if (yPos.get(ids[i])! < minY) yPos.set(ids[i], minY);
  }
  const newCentroid = ids.reduce((s, id) => s + yPos.get(id)!, 0) / ids.length;
  const shift = centroid - newCentroid;
  for (const id of ids) yPos.set(id, yPos.get(id)! + shift);
}
