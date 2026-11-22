// webpack-dev-server client transport of `node-scripts start`: the default WebSocket client that also reports the
// connection state of this xnode to the DESIGN EXPRESS web editor (window.__socketEmitter__, set by its dev installer).
// Uses the client's handler API (onOpen/onClose) instead of replacing the socket callbacks, so the client's own
// close handling (webpack-dev-server ≥6) is kept.
const { default: WebSocketClient } = require('webpack-dev-server/client/clients/WebSocketClient');

module.exports = class ClientWS extends WebSocketClient {
  /** @param {(...args: any[]) => void} f */
  onOpen(f) {
    super.onOpen((...args) => {
      window.__socketEmitter__?.addOrUpdate?.(process.env.NXV_NODE_NAME, 1);
      return f(...args);
    });
  }

  /** @param {(...args: any[]) => void} f */
  onClose(f) {
    super.onClose((...args) => {
      window.__socketEmitter__?.delete?.(process.env.NXV_NODE_NAME);
      return f(...args);
    });
  }
};
