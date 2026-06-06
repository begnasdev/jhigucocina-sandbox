import { createContext, useCallback, useContext, useMemo, useState } from "react";

const RoomContext = createContext(null);

const STORAGE_KEY = "jc-room-v1";

const normalize = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

const readStored = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { room: null, floor: null };
    const parsed = JSON.parse(raw);
    return {
      room: normalize(parsed?.room),
      floor: normalize(parsed?.floor),
    };
  } catch {
    return { room: null, floor: null };
  }
};

const writeStored = (room, floor) => {
  try {
    if (room == null && floor == null) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ room, floor })
    );
  } catch {
    // storage unavailable — ignore
  }
};

const readUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      room: normalize(params.get("room")),
      floor: normalize(params.get("floor")),
    };
  } catch {
    return { room: null, floor: null };
  }
};

const initialState = () => {
  // Priority: URL > sessionStorage > null. URL is authoritative for any
  // field it provides; missing URL fields fall back to stored values.
  const fromUrl = readUrl();
  const fromStore = readStored();

  const room = fromUrl.room ?? fromStore.room ?? null;
  const floor = fromUrl.floor ?? fromStore.floor ?? null;

  // Write-through so any URL-provided value updates sessionStorage.
  if (fromUrl.room !== null || fromUrl.floor !== null) {
    writeStored(room, floor);
  }

  return { room, floor };
};

export function RoomProvider({ children }) {
  const [{ room, floor }, setState] = useState(initialState);

  const setRoom = useCallback((nextRoom, nextFloor) => {
    const r = normalize(nextRoom);
    const f = normalize(nextFloor);
    writeStored(r, f);
    setState({ room: r, floor: f });
  }, []);

  const clearRoom = useCallback(() => {
    writeStored(null, null);
    setState({ room: null, floor: null });
  }, []);

  const value = useMemo(
    () => ({
      room,
      floor,
      hasRoom: !!room,
      setRoom,
      clearRoom,
    }),
    [room, floor, setRoom, clearRoom]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside <RoomProvider>");
  return ctx;
}
