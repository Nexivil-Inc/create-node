const {
  default: baseclass,
} = require('webpack-dev-server/client/clients/WebSocketClient');
const paths = require('./paths');
const appPackage = require(paths.appPackageJson);

module.exports = class ClientWS extends baseclass {
  /**
   * @param {(...args: any[]) => void} f
   */
  onOpen(f) {
    this.client.onopen = () => {
      window.__socketEmitter__?.addOrUpdate?.(appPackage.name, 1);
      f(...arguments);
    };
  }

  /**
   * @param {(...args: any[]) => void} f
   */
  onClose(f) {
    this.client.onclose = () => {
      window.__socketEmitter__?.delete?.(appPackage.name);
      f(...arguments);
    };
  }
};
