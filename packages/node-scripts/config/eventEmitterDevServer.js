const {
  default: baseclass,
} = require('webpack-dev-server/client/clients/WebSocketClient');

module.exports = class ClientWS extends baseclass {
  /**
   * @param {(...args: any[]) => void} f
   */
  onOpen(f) {
    window.__socketEmitter__?.addOrUpdate?.('@dabeom/firestore', 1);
    this.client.onopen = f;
  }

  /**
   * @param {(...args: any[]) => void} f
   */
  onClose(f) {
    window.__socketEmitter__?.delete?.('@dabeom/firestore');
    this.client.onclose = f;
  }
};
