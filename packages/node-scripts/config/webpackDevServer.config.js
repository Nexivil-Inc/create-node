/**
 * webpack-dev-server options of `node-scripts start` — the DESIGN EXPRESS web editor connects to it
 * (@<ns>/<name>:<port>). Based on create-react-app's webpackDevServer.config.js ((c) Facebook, MIT license).
 *
 * Exposure is kept to what the web editor needs:
 *  - bound to localhost (set HOST=0.0.0.0 to opt into LAN access),
 *  - host check on (DANGEROUSLY_DISABLE_HOST_CHECK=true turns it off),
 *  - cross-origin access only for the DESIGN EXPRESS web service (https://x.nexivil.com), always allowed; more origins
 *    (e.g. a local frontend or a desktop app) via DEV_SERVER_ALLOWED_ORIGINS=https://localhost:3000,tauri://localhost.
 *    The allowlist covers fetch + CORS preflight (the editor loads runtime/main/chunks/hot updates with fetch), the HMR
 *    WebSocket (Origin check), and no-cors loads such as <img> (by Referer, since they carry no Origin). Cross-site
 *    no-cors loads from any other page are refused, like webpack-dev-server's own cross-origin check, which this
 *    replaces: a foreign page must not run the bundle as a <script> and read the source.
 */

'use strict';

const fs = require('fs');
const paths = require('./paths');
const getHttpsConfig = require('./getHttpsConfig');
const { ignoredFiles } = require('../utils/devUtils');

const sockHost = process.env.WDS_SOCKET_HOST || 'localhost';
const sockPath = process.env.WDS_SOCKET_PATH; // default: '/ws'
const sockPort = process.env.WDS_SOCKET_PORT;

const DESIGN_EXPRESS_ORIGIN = 'https://x.nexivil.com';

/** "scheme://host[:port]" of a URL (also for non-special schemes such as tauri://, whose URL.origin is "null"). */
function originOf(value) {
  try {
    const url = new URL(value);
    return { origin: url.origin !== 'null' ? url.origin : `${url.protocol}//${url.host}`, hostname: url.hostname };
  } catch {
    return null;
  }
}

/** @returns {{ origin: string, hostname: string }[]} https://x.nexivil.com first, then DEV_SERVER_ALLOWED_ORIGINS */
function allowedOrigins() {
  const list = [originOf(DESIGN_EXPRESS_ORIGIN)];
  for (const entry of (process.env.DEV_SERVER_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)) {
    const parsed = entry === '*' ? null : originOf(entry);
    if (!parsed) {
      console.warn(`DEV_SERVER_ALLOWED_ORIGINS: ignored "${entry}" (list origins such as https://localhost:3000).`);
      continue;
    }
    if (!list.some(o => o.origin === parsed.origin)) list.push(parsed);
  }
  return list;
}

/**
 * Cross-origin policy of the dev server (replaces webpack-dev-server's "cross-origin-header-check"):
 * CORS + Private Network Access preflight for the allowed origins, no-cors loads only from their pages.
 */
function crossOriginMiddleware(origins) {
  const isAllowed = value => {
    const parsed = value && originOf(value);
    return !!parsed && origins.some(o => o.origin === parsed.origin);
  };
  return function crossOrigin(req, res, next) {
    const headers = req.headers;
    const origin = headers.origin;
    const corsAllowed = !!origin && isAllowed(origin);
    res.setHeader('Vary', 'Origin');
    if (corsAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', headers['access-control-request-headers'] || '*');
      if (headers['access-control-request-private-network']) res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    if (req.method === 'OPTIONS' && headers['access-control-request-method']) {
      res.statusCode = corsAllowed ? 204 : 403;
      return res.end();
    }
    // <img>, <script>, CSS url(): no Origin header; the page is known from the Referer (origin-only by default).
    const pageAllowed = corsAllowed || (!origin && isAllowed(headers.referer));
    if (!pageAllowed && headers['sec-fetch-mode'] === 'no-cors' && headers['sec-fetch-site'] === 'cross-site') {
      res.statusCode = 403;
      return res.end('Cross-Origin request blocked');
    }
    // Browsers without Sec-Fetch-* still enforce this for no-cors loads (and it is required under COEP: require-corp).
    res.setHeader('Cross-Origin-Resource-Policy', pageAllowed ? 'cross-origin' : 'same-origin');
    return next();
  };
}

module.exports = function (proxy, allowedHost) {
  const hostCheckOff = process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true';
  const origins = allowedOrigins();
  return {
    host: process.env.HOST || 'localhost',
    // Host header: loopback names (+ the LAN host when HOST is set). webpack-dev-server also checks the Origin of the
    // HMR WebSocket against this list, so the hostnames of the allowed origins are listed too (x.nexivil.com).
    allowedHosts: hostCheckOff
      ? 'all'
      : [...new Set(['localhost', '127.0.0.1', '[::1]', ...(allowedHost ? [allowedHost] : []), ...origins.map(o => o.hostname)])],
    compress: true,
    static: fs.existsSync(paths.appPublic)
      ? {
          directory: paths.appPublic,
          publicPath: [paths.publicUrlOrPath],
          watch: { ignored: ignoredFiles(paths.appSrc) },
        }
      : false,
    client: {
      // reports the connection to the web editor (window.__socketEmitter__)
      webSocketTransport: require.resolve('./eventEmitterDevServer'),
      webSocketURL: {
        hostname: sockHost,
        pathname: sockPath,
        port: sockPort,
      },
      overlay: {
        errors: true,
        warnings: false,
      },
      reconnect: false,
    },
    webSocketServer: 'ws',
    devMiddleware: {
      publicPath: paths.publicUrlOrPath.slice(0, -1),
    },
    ...getHttpsConfig(),
    proxy,
    hot: 'only',
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) throw new Error('webpack-dev-server is not defined');
      // after the Host check (a rebound DNS name is refused first), in place of the built-in cross-origin check
      const policy = { name: 'design-express-cross-origin', middleware: crossOriginMiddleware(origins) };
      const builtIn = middlewares.findIndex(m => m.name === 'cross-origin-header-check');
      const hostCheck = middlewares.findIndex(m => m.name === 'host-header-check');
      if (builtIn >= 0) middlewares.splice(builtIn, 1, policy);
      else middlewares.splice(hostCheck + 1, 0, policy);
      // src/setupProxy.js: custom middleware (proxying)
      if (fs.existsSync(paths.proxySetup)) require(paths.proxySetup)(devServer.app);
      return middlewares;
    },
  };
};

module.exports.allowedOrigins = allowedOrigins;
