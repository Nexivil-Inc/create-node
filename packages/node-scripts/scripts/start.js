/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';
// `node-scripts start` — development server for the DESIGN EXPRESS web editor (connect @<ns>/<name>:<port>).
// For hot reload without a server use `node-scripts watch`.

process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

process.on('unhandledRejection', err => {
  throw err;
});

require('../config/env');

const fs = require('fs');
const chalk = require('../utils/colors');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const { clearConsole, choosePort, prepareProxy, prepareUrls } = require('../utils/devUtils');
const semver = require('semver');
const { createCompiler } = require('../utils/webpackDevServerUtils');
const paths = require('../config/paths');
const createDevServerConfig = require('../config/webpackDevServer.config');
const getClientEnvironment = require('../config/env');
const { createDevConfig } = require('../utils/devConfig');

const react = require(require.resolve('react', { paths: [paths.appPath] }));
const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));
const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
// localhost only unless HOST is set (HOST=0.0.0.0 opts into LAN access)
const HOST = process.env.HOST || 'localhost';

if (process.env.HOST) {
  console.log(chalk.cyan(`Attempting to bind to HOST environment variable: ${chalk.yellow(chalk.bold(process.env.HOST))}`));
  console.log(`If this was unintentional, check that you haven't mistakenly set it in your shell.`);
  console.log();
}

choosePort(HOST, DEFAULT_PORT)
  .then(port => {
    if (port == null) return; // no port found

    const appName = require(paths.appPackageJson).name;
    const { config, attach } = createDevConfig({
      publicPath: `http://localhost:${port}/${appName.replace('@', '')}/`,
      devtool: 'eval-source-map',
      cacheName: 'start',
    });
    config.stats = 'none'; // createCompiler prints the result (the dev middleware would also dump the asset list)

    const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
    const urls = prepareUrls(protocol, HOST, port, paths.publicUrlOrPath.slice(0, -1));
    const compiler = createCompiler({ appName, config, urls, port, useYarn, webpack });
    const detach = attach(compiler);

    const proxySetting = require(paths.appPackageJson).proxy;
    const proxyConfig = prepareProxy(proxySetting, paths.appPublic, paths.publicUrlOrPath);
    const devServer = new WebpackDevServer(
      { ...createDevServerConfig(proxyConfig, urls.lanUrlForConfig), host: HOST, port },
      compiler,
    );
    devServer.startCallback(() => {
      if (isInteractive) clearConsole();
      if (env.raw.FAST_REFRESH && semver.lt(react.version, '16.10.0')) {
        console.log(chalk.yellow(`Fast Refresh requires React 16.10 or higher. You are using React ${react.version}.`));
      }
      console.log(chalk.cyan('Starting the development server...\n'));
    });

    const stop = () => {
      detach();
      devServer.stop().finally(() => process.exit());
    };
    ['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, stop));
    if (process.env.CI !== 'true') process.stdin.on('end', stop);
  })
  .catch(err => {
    if (err && err.message) console.log(err.message);
    process.exit(1);
  });
