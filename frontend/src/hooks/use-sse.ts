"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface TransactionEvent {
  type: "TRANSFER_COMPLETED" | "TRANSFER_FAILED" | "TRANSFER_INITIATED";
  transaction?: {
    id: string;
    amount: number;
    description: string;
    status: string;
    createdAt: string;
  };
  error?: string;
}

export function useSSE(token: string | null) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<TransactionEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const url = new URL("/api/v1/stream/transactions", baseUrl);
    url.searchParams.set("token", token);

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.addEventListener("transaction.completed", (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent({ type: "TRANSFER_COMPLETED", transaction: data });
      } catch {}
    });

    eventSource.addEventListener("transaction.failed", (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent({ type: "TRANSFER_FAILED", transaction: data, error: data.error });
      } catch {}
    });

    eventSource.addEventListener("transaction.initiated", (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent({ type: "TRANSFER_INITIATED", transaction: data });
      } catch {}
    });

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [token]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const clearLastEvent = useCallback(() => {
    setLastEvent(null);
  }, []);

  return { connected, lastEvent, clearLastEvent };
}
