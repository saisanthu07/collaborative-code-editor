import { WebSocketServer } from "ws";
// y-websocket only exposes this subpath as a CommonJS build ("./bin/utils"
// -> bin/utils.cjs per its package.json "exports" map) — no ".js" suffix.
import { setupWSConnection } from "y-websocket/bin/utils";

// The Yjs CRDT relay lives on its own WebSocket path, separate from
// Socket.IO. Socket.IO handles chat/presence/room events (section 21);
// Yjs + y-websocket handles the actual collaborative document sync
// (section 9/40) so the two concerns never get tangled together.
//
// Each room gets its own Y.Doc, keyed by the "docName" the client passes
// in the connection URL (we use the roomId), so edits in Room A can never
// leak into Room B.
export function attachYjsWebsocketServer(httpServer, path = "/yjs") {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    if (!pathname.startsWith(path)) return; // let other upgrade handlers (Socket.IO) deal with it

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (conn, req) => {
    // docName is derived from the URL path, e.g. /yjs/<roomId>
    setupWSConnection(conn, req, { gc: true });
  });

  console.log(`[yjs] Collaborative editing relay attached at ${path}`);
  return wss;
}
