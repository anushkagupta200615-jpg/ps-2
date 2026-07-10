"use client";

import { getSocket } from "@/lib/socket";
import React, { useEffect, useRef } from "react";

function GeoUpdater({ userId }: { userId: string | undefined }) {
  const socketRef = useRef<any>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;
    if (!navigator.geolocation) return;

    socketRef.current = getSocket();

    const authenticateSocket = async () => {
      try {
        const res = await fetch("/api/socket-token");
        if (res.ok) {
          const { token } = await res.json();
          socketRef.current.emit("identity", { token });
        } else {
          console.error("Failed to fetch socket token");
        }
      } catch (error) {
        console.error("Error fetching socket token:", error);
      }
    };
    authenticateSocket();
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();

        // 🔥 Throttle: send only every 10 seconds
        if (now - lastSentRef.current < 10000) return;

        lastSentRef.current = now;

        socketRef.current.emit("update-location", {
          userId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => console.log(err),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watcher);
    };
  }, [userId]);

  return null;
}

export default GeoUpdater;