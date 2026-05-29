import { io, type Socket } from "socket.io-client";

const COLORS = ["#60A5FA", "#34D399", "#F87171", "#FBBF24", "#A78BFA", "#F472B6"];
const NAMES = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Drew"];

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type CollabUser = {
  id: string;
  name: string;
  color: string;
};

let socket: Socket | null = null;
let _myUser: CollabUser | null = null;

export function getMyUser(): CollabUser {
  if (_myUser) return _myUser;
  const stored = localStorage.getItem("cloudearc-collab-user");
  if (stored) {
    try {
      _myUser = JSON.parse(stored);
      return _myUser!;
    } catch {}
  }
  _myUser = {
    id: crypto.randomUUID(),
    name: randItem(NAMES),
    color: randItem(COLORS),
  };
  localStorage.setItem("cloudearc-collab-user", JSON.stringify(_myUser));
  return _myUser;
}

export function connectCollab(projectId: string): Socket {
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io("", {
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    socket!.emit("join", { projectId, user: getMyUser() });
  });

  return socket;
}

export function disconnectCollab() {
  socket?.disconnect();
  socket = null;
}

export function emitFileWrite(path: string, content: string) {
  socket?.emit("file-write", { path, content });
}

export function emitFileDelete(path: string) {
  socket?.emit("file-delete", { path });
}

export function emitChatMessage(msg: { kind: string; content: string; id: number }) {
  socket?.emit("chat-message", msg);
}

export function emitBuildStarted(label: string) {
  socket?.emit("build-started", { label });
}
