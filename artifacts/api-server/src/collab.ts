import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";

export type CollabUser = {
  id: string;
  name: string;
  color: string;
};

const rooms = new Map<string, Map<string, CollabUser>>();

export function setupCollab(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;
    let currentUser: CollabUser | null = null;

    socket.on("join", ({ projectId, user }: { projectId: string; user: CollabUser }) => {
      currentRoom = projectId;
      currentUser = user;
      socket.join(projectId);

      if (!rooms.has(projectId)) rooms.set(projectId, new Map());
      rooms.get(projectId)!.set(socket.id, user);

      const users = Array.from(rooms.get(projectId)!.values());
      socket.emit("room-state", { users });
      socket.to(projectId).emit("user-joined", { user });
    });

    socket.on("file-write", ({ path, content }: { path: string; content: string }) => {
      if (!currentRoom || !currentUser) return;
      socket.to(currentRoom).emit("file-write", { path, content, userId: currentUser.id });
    });

    socket.on("file-delete", ({ path }: { path: string }) => {
      if (!currentRoom || !currentUser) return;
      socket.to(currentRoom).emit("file-delete", { path, userId: currentUser.id });
    });

    socket.on("chat-message", (msg: { kind: string; content: string; id: number }) => {
      if (!currentRoom || !currentUser) return;
      socket.to(currentRoom).emit("chat-message", { ...msg, userId: currentUser.id });
    });

    socket.on("build-started", ({ label }: { label: string }) => {
      if (!currentRoom || !currentUser) return;
      socket.to(currentRoom).emit("build-started", { label, user: currentUser });
    });

    socket.on("disconnect", () => {
      if (currentRoom && currentUser) {
        rooms.get(currentRoom)?.delete(socket.id);
        socket.to(currentRoom).emit("user-left", { userId: currentUser.id });
      }
    });
  });

  return io;
}
