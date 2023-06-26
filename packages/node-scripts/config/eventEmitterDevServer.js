const {
  default: baseclass,
} = require('webpack-dev-server/client/clients/WebSocketClient');
// const paths = require('./paths');
// const appPackage = require(paths.appPackageJson);

module.exports = class ClientWS extends baseclass {
  /**
   * @param {(...args: any[]) => void} f
   */
  onOpen(f) {
    this.client.onopen = () => {
      window.__socketEmitter__?.addOrUpdate?.(process.env.NXV_NODE_NAME, 1);
      f(...arguments);
    };
  }

  /**
   * @param {(...args: any[]) => void} f
   */
  onClose(f) {
    this.client.onclose = () => {
      window.__socketEmitter__?.delete?.(process.env.NXV_NODE_NAME);
      f(...arguments);
    };
  }
};
