"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Edge,
  type Connection,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import { useAccount } from "wagmi";
import { isValidConnection } from "./validation";
import { VALID_CONNECTIONS, type CanvasNode, type CanvasNodeData } from "./types";
import { consumeImportedStrategy } from "./importStrategy";
import { buildInitialLayout } from "./layout";

const MAX_HISTORY = 50;
const STORAGE_KEY = "atala-canvas-43114";

interface SavedGraph {
  nodes: CanvasNode[];
  edges: Edge[];
}

export function useCanvasState() {
  const { address } = useAccount();

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const initialized = useRef(false);
  const wasImported = useRef(false);

  // Undo / Redo history
  const historyRef = useRef<SavedGraph[]>([]);
  const redoRef = useRef<SavedGraph[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  const pushHistory = useCallback(() => {
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    redoRef.current = [];
    setHistoryVersion((v) => v + 1);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    redoRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistoryVersion((v) => v + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryVersion((v) => v + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const canUndo = historyRef.current.length > 0;
  const canRedo = redoRef.current.length > 0;
  void historyVersion;

  // Initialize
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const imported = consumeImportedStrategy();
    if (imported) {
      setNodes(imported.nodes);
      setEdges(imported.edges);
      wasImported.current = true;
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedGraph;
        if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges || []);
          return;
        }
      }
    } catch { /* ignore */ }

    const initial = buildInitialLayout(address);
    setNodes(initial);
  }, [address, setNodes, setEdges]);

  // Auto-save (debounced 2s)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!initialized.current || nodes.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const cleanNodes = nodes.map((n) => {
          const d = n.data as { type: string };
          if (d.type === "wallet") {
            return { ...n, data: { ...n.data, balances: [] } } as CanvasNode;
          }
          return n;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: cleanNodes, edges }));
      } catch { /* quota exceeded */ }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [nodes, edges]);

  // Connection handler
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection, nodes as CanvasNode[])) return;
      pushHistory();
      setEdges((eds) =>
        addEdge({ ...connection, type: "animatedEdge", animated: true }, eds)
      );
    },
    [nodes, setEdges, pushHistory]
  );

  // Add node
  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const id = `${type}-${Date.now()}`;
      let data: CanvasNodeData;

      switch (type) {
        case "eulerDeposit":
          data = { type: "eulerDeposit", vault: null, amount: "", amountUsd: 0 };
          break;
        case "eulerBorrow":
          data = {
            type: "eulerBorrow", vault: null, collateralVault: null,
            ltvPercent: 50, borrowAmount: 0, borrowAmountUsd: 0,
            healthFactor: null, depositAmountUsd: 0,
          };
          break;
        case "eulerWithdraw":
          data = { type: "eulerWithdraw", position: null, amount: "" };
          break;
        case "eulerRepay":
          data = { type: "eulerRepay", vault: null, amount: "", amountUsd: 0 };
          break;
        case "siloDeposit":
          data = { type: "siloDeposit", pair: null, side: 0, amount: "", amountUsd: 0 };
          break;
        case "siloBorrow":
          data = {
            type: "siloBorrow", pair: null, side: 1,
            ltvPercent: 50, borrowAmount: 0, borrowAmountUsd: 0,
            healthFactor: null, depositAmountUsd: 0,
          };
          break;
        case "siloWithdraw":
          data = { type: "siloWithdraw", position: null, amount: "" };
          break;
        case "siloRepay":
          data = { type: "siloRepay", pair: null, side: 0, amount: "", amountUsd: 0 };
          break;
        case "swap":
          data = { type: "swap", tokenIn: null, tokenOut: null, amountIn: "", quoteOut: "", quoteLoading: false };
          break;
        case "atalaDeposit":
          data = { type: "atalaDeposit", vault: null, amount: "", amountUsd: 0 };
          break;
        case "atalaWithdraw":
          data = { type: "atalaWithdraw", position: null, amount: "" };
          break;
        default:
          return;
      }

      const nodeTypeMap: Record<string, string> = {
        eulerDeposit: "eulerDepositNode",
        eulerBorrow: "eulerBorrowNode",
        eulerWithdraw: "eulerWithdrawNode",
        eulerRepay: "eulerRepayNode",
        siloDeposit: "siloDepositNode",
        siloBorrow: "siloBorrowNode",
        siloWithdraw: "siloWithdrawNode",
        siloRepay: "siloRepayNode",
        swap: "swapNode",
        atalaDeposit: "atalaDepositNode",
        atalaWithdraw: "atalaWithdrawNode",
      };

      const newNode: CanvasNode = {
        id,
        type: nodeTypeMap[type] || type,
        position,
        data,
      };

      pushHistory();
      setNodes((nds) => [...nds, newNode]);
      return id;
    },
    [setNodes, pushHistory]
  );

  // Delete node with bridge reconnection
  const deleteNode = useCallback(
    (nodeId: string) => {
      pushHistory();
      const incoming = edges.filter((e) => e.target === nodeId);
      const outgoing = edges.filter((e) => e.source === nodeId);
      const bridgeEdges: Edge[] = [];
      const currentNodes = nodes as CanvasNode[];

      for (const inEdge of incoming) {
        for (const outEdge of outgoing) {
          const sourceNode = currentNodes.find((n) => n.id === inEdge.source);
          const targetNode = currentNodes.find((n) => n.id === outEdge.target);
          if (!sourceNode || !targetNode) continue;
          const sourceType = (sourceNode.data as { type: string }).type;
          const targetType = (targetNode.data as { type: string }).type;
          const allowed = VALID_CONNECTIONS[sourceType];
          if (allowed?.includes(targetType)) {
            bridgeEdges.push({
              id: `${inEdge.source}-${outEdge.target}`,
              source: inEdge.source,
              target: outEdge.target,
              type: "animatedEdge",
              animated: true,
            });
          }
        }
      }

      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => [
        ...eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
        ...bridgeEdges,
      ]);
    },
    [setNodes, setEdges, edges, nodes, pushHistory]
  );

  // Update node data
  const updateNodeData = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? ({ ...n, data: { ...n.data, ...newData } } as CanvasNode)
            : n
        )
      );
    },
    [setNodes]
  );

  // Clear canvas
  const clearGraph = useCallback(() => {
    pushHistory();
    const initial = buildInitialLayout(address);
    setNodes(initial);
    setEdges([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, [address, setNodes, setEdges, pushHistory]);

  return {
    nodes, edges,
    onNodesChange: onNodesChange as OnNodesChange<CanvasNode>,
    onEdgesChange: onEdgesChange as OnEdgesChange<Edge>,
    onConnect, addNode, deleteNode, updateNodeData,
    clearGraph, undo, redo, canUndo, canRedo, pushHistory,
    setNodes, setEdges, wasImported,
  };
}
