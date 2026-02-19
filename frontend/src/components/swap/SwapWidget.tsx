"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAccount } from "wagmi";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EIP1193Provider = { request: (args: any) => Promise<any>; on?: (event: string, handler: (...args: any[]) => void) => void; removeListener?: (event: string, handler: (...args: any[]) => void) => void };

// ── CoW Protocol postMessage keys (must match their iframe-transport) ──
const WIDGET_KEY = "cowSwapWidget";
const RPC_KEY = "cowSwapIframeRpcProviderTransport";

const EVENTS_TO_FORWARD = [
  "connect",
  "disconnect",
  "close",
  "chainChanged",
  "accountsChanged",
];

const darkPalette = {
  baseTheme: "dark",
  primary: "#06b6d4",
  background: "#0a0a0a",
  paper: "#171717",
  text: "#fafafa",
  danger: "#ef4444",
  warning: "#f59e0b",
  alert: "#f59e0b",
  info: "#3b82f6",
  success: "#22c55e",
};

function buildIframeSrc(hasProvider: boolean): string {
  const path = `/43114/widget/swap/WAVAX/USDC`;
  const query = new URLSearchParams();
  query.append("palette", JSON.stringify(darkPalette));
  query.append("theme", "dark");
  if (!hasProvider) {
    query.append("standaloneMode", "true");
  }
  return `https://swap.cow.fi/#${path}?${query.toString()}`;
}

export default function SwapWidget() {
  const { isConnected } = useAccount();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const providerRef = useRef<EIP1193Provider | null>(null);

  // Get the EIP-1193 provider
  const getProvider = useCallback((): EIP1193Provider | null => {
    if (isConnected && typeof window !== "undefined" && (window as never as { ethereum?: EIP1193Provider }).ethereum) {
      return (window as never as { ethereum: EIP1193Provider }).ethereum;
    }
    return null;
  }, [isConnected]);

  // Forward RPC calls from iframe to window.ethereum
  useEffect(() => {
    const provider = getProvider();
    providerRef.current = provider;

    if (!provider) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      const iframe = iframeRef.current?.contentWindow;
      if (!iframe) return;

      // Handle widget ACTIVATE → send appCode
      if (data.key === WIDGET_KEY && data.method === "ACTIVATE") {
        iframe.postMessage(
          {
            key: WIDGET_KEY,
            method: "UPDATE_APP_DATA",
            metaData: { appCode: "Atala Finance" },
          },
          "*"
        );

        // Also send initial params
        const search = new URLSearchParams();
        search.append("palette", JSON.stringify(darkPalette));
        search.append("theme", "dark");
        iframe.postMessage(
          {
            key: WIDGET_KEY,
            method: "UPDATE_PARAMS",
            urlParams: {
              pathname: "/43114/widget/swap/WAVAX/USDC",
              search: search.toString(),
            },
            appParams: {
              appCode: "Atala Finance",
              chainId: 43114,
              tradeType: "swap",
              enabledTradeTypes: ["swap", "limit"],
              sell: { asset: "WAVAX" },
              buy: { asset: "USDC" },
              hideNetworkSelector: true,
              standaloneMode: false,
            },
            hasProvider: true,
          },
          "*"
        );
        return;
      }

      // Handle RPC requests from iframe
      if (
        data.key === RPC_KEY &&
        data.method === "PROVIDER_RPC_REQUEST" &&
        data.rpcRequest
      ) {
        const { id, jsonrpc, method, params } = data.rpcRequest;
        if (!id) return;

        const rpcMethod =
          method === "enable" ? "eth_requestAccounts" : method;

        provider
          .request({ method: rpcMethod, params } as never)
          .then((result: unknown) => {
            iframe.postMessage(
              {
                key: RPC_KEY,
                method: "PROVIDER_RPC_RESPONSE",
                rpcResponse: { jsonrpc, id, result },
              },
              "*"
            );
          })
          .catch((error: unknown) => {
            iframe.postMessage(
              {
                key: RPC_KEY,
                method: "PROVIDER_RPC_RESPONSE",
                rpcResponse: { jsonrpc, id, error },
              },
              "*"
            );
          });
        return;
      }

      // Handle provider meta info request
      if (
        data.key === RPC_KEY &&
        data.method === "REQUEST_PROVIDER_META_INFO"
      ) {
        iframe.postMessage(
          {
            key: RPC_KEY,
            method: "SEND_PROVIDER_META_INFO",
            providerEip6963Info: undefined,
            providerWcMetadata: undefined,
          },
          "*"
        );
        return;
      }
    };

    window.addEventListener("message", handleMessage);

    // Forward wallet events to iframe
    const eventCleanups: (() => void)[] = [];
    EVENTS_TO_FORWARD.forEach((eventName) => {
      const handler = (params: unknown) => {
        const iframe = iframeRef.current?.contentWindow;
        if (!iframe) return;
        iframe.postMessage(
          {
            key: RPC_KEY,
            method: "PROVIDER_ON_EVENT",
            event: eventName,
            params,
          },
          "*"
        );
      };
      provider.on?.(eventName, handler);
      eventCleanups.push(() => provider.removeListener?.(eventName, handler));
    });

    return () => {
      window.removeEventListener("message", handleMessage);
      eventCleanups.forEach((fn) => fn());
    };
  }, [getProvider]);

  // Handle dynamic height from widget
  useEffect(() => {
    const handleHeight = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.key === WIDGET_KEY && data.method === "UPDATE_HEIGHT") {
        const iframe = iframeRef.current;
        if (iframe && data.height) {
          iframe.style.height = `${data.height + 20}px`;
        }
      }
    };

    window.addEventListener("message", handleHeight);
    return () => window.removeEventListener("message", handleHeight);
  }, []);

  const hasProvider = isConnected && typeof window !== "undefined" && !!(window as never as { ethereum?: EIP1193Provider }).ethereum;

  return (
    <div className="w-full max-w-[480px]">
      <iframe
        ref={iframeRef}
        src={buildIframeSrc(hasProvider)}
        width="460"
        height="640"
        style={{ border: "none", borderRadius: "16px" }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
