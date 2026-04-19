import { useEffect, useRef } from "react";

export type SSEHandler<T = unknown> = (data: T) => void;

export function useMockSSE(
  intervalMs: number,
  handler: () => void,
  enabled = true,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => handlerRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}

export function shortId(id: string, len = 8): string {
  if (!id) return "";
  return id.length > len ? id.slice(0, len) : id;
}
