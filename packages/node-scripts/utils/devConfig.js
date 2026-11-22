'use strict';
// Development configuration shared by `start` (dev server) and `watch` (server-less HMR):
// the dev entry (src/index.js → generated main.js that registers every src/nodes/**/+*.js export and re-registers
// them on hot updates), publicPath, source maps, and the watcher that regenerates main.js when entry files appear.
const path = require('path');
const VirtualModulesPlugin = require('webpack-virtual-modules');
const paths = require('../config/paths');
const configFactory = require('../config/webpack.config');
const generatorEntryDev = require('./generateEntryDev');

const INDEX = path.join(paths.appSrc, 'index.js');
const MAIN = path.join(paths.appSrc, 'main.js');

/**
 * @param {{ publicPath: string, devtool?: string|false, extraEntries?: string[], cacheName?: string }} opts
 * @returns {{ config: import('webpack').Configuration, appName: string, attach: (compiler) => () => void, watchIgnored: (dirs?: string[]) => RegExp }}
 */
function createDevConfig({ publicPath, devtool = 'eval-source-map', extraEntries = [], cacheName = 'development' }) {
  const appName = require(paths.appPackageJson).name;
  const overrideConfig = require(paths.appWiredWebpack);
  const config = overrideConfig(configFactory('development'), 'development');

  // The last entry is src/: replace it with the generated dev entry.
  config.entry.pop();
  config.entry.push(...extraEntries, INDEX);
  config.output.publicPath = publicPath;
  config.output.devtoolModuleFilenameTemplate = `webpack://${appName.replace('@', '')}/[resource-path]`;
  config.devtool = devtool;
  if (config.cache && typeof config.cache === 'object') config.cache.name = cacheName;

  // src/index.js and src/main.js exist only in memory: the disk watcher would report them as removed after the first
  // compile and start a second, identical one. main.js changes are signalled with watching.invalidate() instead.
  // (webpack accepts either glob strings or one RegExp, so everything is one RegExp on "/"-separated paths.)
  const escape = p => p.split(path.sep).join('/').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /** @param {string[]} dirs extra directories to ignore (e.g. the watch output) */
  const watchIgnored = (dirs = []) =>
    new RegExp(
      ['/node_modules/', `^(?:${escape(INDEX)}|${escape(MAIN)})$`, ...dirs.map(d => `^${escape(d)}(?:/|$)`)].join('|'),
    );
  config.watchOptions = { aggregateTimeout: 150, ignored: watchIgnored() };

  const virtualModules = new VirtualModulesPlugin({
    [INDEX]: 'export * from "./main.js"; if(module.hot) module.hot.accept();',
  });
  config.plugins.push(virtualModules);

  /** Keep main.js in sync with the node entry files; returns a disposer. */
  function attach(compiler) {
    // Write only when the entry list changed: every write bumps the virtual file's mtime, which made the watcher
    // schedule a second, identical compile right after the first one.
    let current;
    const sync = () => {
      const next = generatorEntryDev();
      if (next === current) return false;
      current = next;
      virtualModules.writeModule(MAIN, next);
      return true;
    };
    compiler.hooks.thisCompilation.tap('NodeScriptsDevEntry', sync);
    // A new +<name>.js file is not part of the dependency graph yet: touch main.js so it is picked up.
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(paths.appSrc, {
      persistent: false,
      ignoreInitial: true,
      ignored: (p, stats) => !!stats?.isFile() && !/[\\/]\+[^\\/]+\.(js|jsx|ts|tsx)$/.test(p),
    });
    let timer;
    const touch = () => {
      clearTimeout(timer);
      timer = setTimeout(() => sync() && compiler.watching?.invalidate(), 300);
    };
    watcher.on('add', touch).on('unlink', touch);
    return () => {
      clearTimeout(timer);
      return watcher.close();
    };
  }

  return { config, appName, attach, watchIgnored };
}

module.exports = { createDevConfig };
