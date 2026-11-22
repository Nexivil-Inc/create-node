'use strict';
// `node-scripts watch` — development build with hot module replacement, WITHOUT a dev server:
// no HTTP(S) server, no WebSocket, no port. webpack rebuilds incrementally into build-dev/ (or --out) and writes
// build-dev/hmr.json after every build. The host that runs the bundle (e.g. the Fabrica VS Code extension) serves the
// files itself and triggers the update through client/hmr-client.js (globalThis.__NODE_SCRIPTS_HMR__).
//
//   node-scripts watch [--out <dir>] [--public-path <url>]
//     --out          output directory (default: build-dev)
//     --public-path  URL prefix the host serves the output under (default: /__node_scripts_dev__/<ns>/<name>/)
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node-scripts watch [--out <dir>] [--public-path <url>]');
  console.log('  --out          output directory (default: build-dev)');
  console.log('  --public-path  URL prefix the host serves the output under');
  process.exit(0);
}

process.on('unhandledRejection', err => {
  throw err;
});

require('../config/env');

const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const colors = require('../utils/colors');
const paths = require('../config/paths');
const { createDevConfig } = require('../utils/devConfig');

function option(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const appName = require(paths.appPackageJson).name;
const outDir = path.resolve(paths.appPath, option('--out', 'build-dev'));
const publicPath = option('--public-path', `/__node_scripts_dev__/${appName.replace('@', '')}/`);
if (path.relative(paths.appPath, outDir).startsWith('..')) {
  console.error(colors.red('The --out directory must be inside the project.'));
  process.exit(1);
}

const STATUS = 'hmr.json';
const KEEP_UPDATES = 20; // hot updates of the last N builds stay on disk (a host may lag a few builds behind)

/** Writes build-dev/hmr.json after each build and prunes old hot-update files. */
class HmrStatusPlugin {
  constructor() {
    this.hashes = [];
  }
  apply(compiler) {
    compiler.hooks.done.tap('NodeScriptsHmrStatus', stats => {
      const info = stats.toJson({ all: false, hash: true, errors: true, warnings: true, timings: true, errorsCount: true, warningsCount: true });
      const ok = !stats.hasErrors();
      const status = {
        name: appName,
        hash: info.hash,
        ok,
        time: info.time,
        builtAt: Date.now(),
        errors: (info.errors || []).slice(0, 5).map(e => (typeof e === 'string' ? e : `${e.moduleName ? e.moduleName + ': ' : ''}${e.message}`)),
        warnings: info.warningsCount || 0,
      };
      const tmp = path.join(outDir, `${STATUS}.tmp`);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(status, null, 1));
      fs.renameSync(tmp, path.join(outDir, STATUS));
      if (ok) this.prune(info.hash);
      console.log(
        ok
          ? `${colors.green('[node-scripts] watch:')} compiled ${info.hash} in ${info.time} ms${status.warnings ? colors.yellow(` (${status.warnings} warnings)`) : ''}`
          : `${colors.red('[node-scripts] watch: failed')}\n${status.errors.join('\n\n')}`,
      );
    });
  }
  prune(hash) {
    this.hashes.push(hash);
    if (this.hashes.length <= KEEP_UPDATES) return;
    const keep = new Set(this.hashes.slice(-KEEP_UPDATES));
    this.hashes = [...keep];
    for (const f of fs.readdirSync(outDir)) {
      const m = /\.([0-9a-f]{8,})\.hot-update\.(js|json)$/.exec(f);
      if (m && !keep.has(m[1])) fs.rmSync(path.join(outDir, f), { force: true });
    }
  }
}

const { config, attach, watchIgnored } = createDevConfig({
  publicPath,
  devtool: 'eval-cheap-module-source-map',
  extraEntries: [require.resolve('../client/hmr-client.js')],
  cacheName: 'watch',
});
config.output.path = outDir;
// The Fabrica dev installer evaluates runtime.js/main.js with a per-URL proxy as window/self/globalThis (writes stay in
// the proxy), while chunks and hot updates are loaded from the publicPath — another URL, so another proxy. webpack's
// globals (the hot-update callback, the chunk array) therefore live on the page's real window, which `document` (not
// shadowed by the proxy) still reaches. Without this a hot update cannot find the runtime that requested it.
config.output.globalObject = '(typeof document !== "undefined" && document.defaultView || globalThis)';
config.plugins.push(
  new webpack.HotModuleReplacementPlugin(),
  new webpack.DefinePlugin({ __NODE_SCRIPTS_PACKAGE__: JSON.stringify(appName) }),
  new HmrStatusPlugin(),
);

fs.rmSync(outDir, { recursive: true, force: true });
const compiler = webpack(config);
const detach = attach(compiler);
console.log(colors.cyan(`[node-scripts] watch: ${appName} → ${path.relative(paths.appPath, outDir)}/ (no server)`));
const watching = compiler.watch({ ...config.watchOptions, ignored: watchIgnored([outDir]) }, err => {
  if (err) console.error(colors.red(`[node-scripts] watch: ${err.stack || err}`));
});

function stop() {
  detach();
  watching.close(() => process.exit(0));
}
['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, stop));
if (process.env.CI !== 'true') process.stdin.on('end', stop);
