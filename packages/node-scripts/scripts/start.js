// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');

const fs = require('fs');
const path = require('path');
const chalk = require('react-dev-utils/chalk');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const clearConsole = require('react-dev-utils/clearConsole');
const chokidar = require('chokidar');
// const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const {
  choosePort,
  createCompiler,
  prepareProxy,
  prepareUrls,
} = require('react-dev-utils/WebpackDevServerUtils');
// const openBrowser = require('react-dev-utils/openBrowser');
const semver = require('semver');
const paths = require('../config/paths');
const configFactory = require('../config/webpack.config');
const createDevServerConfig = require('../config/webpackDevServer.config');
const getClientEnvironment = require('../config/env');
const react = require(require.resolve('react', { paths: [paths.appPath] }));

const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));
const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
// if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
//   process.exit(1);
// }

// Tools like Cloud9 rely on this.
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.HOST) {
  console.log(
    chalk.cyan(
      `Attempting to bind to HOST environment variable: ${chalk.yellow(
        chalk.bold(process.env.HOST)
      )}`
    )
  );
  console.log(
    `If this was unintentional, check that you haven't mistakenly set it in your shell.`
  );
  console.log(
    `Learn more here: ${chalk.yellow('https://cra.link/advanced-config')}`
  );
  console.log();
}

// We require that you explicitly set browsers and do not fall back to
// browserslist defaults.
const { checkBrowsers } = require('react-dev-utils/browsersHelper');
const VirtualModulesPlugin = require('webpack-virtual-modules');
const generatorEntryDev = require('../utils/generateEntryDev');

checkBrowsers(paths.appPath, isInteractive)
  .then(() => {
    // We attempt to use the default port but if it is busy, we offer the user to
    // run on a different port. `choosePort()` Promise resolves to the next free port.
    return choosePort(HOST, DEFAULT_PORT);
  })
  .then(port => {
    if (port == null) {
      // We have not found a port.
      return;
    }
    const appName = require(paths.appPackageJson).name;

    const overrideConfig = require(paths.appWiredWebpack);

    const config = overrideConfig(configFactory('development'), 'development');
    config.entry.pop();
    config.entry.push(path.join(paths.appSrc, 'index.js'));
    config.output.publicPath = `http://localhost:${port}/${appName.replace(
      '@',
      ''
    )}/`;
    config.output.devtoolModuleFilenameTemplate = `webpack://${appName.replace(
      '@',
      ''
    )}/[resource-path]`;
    //enforce HMR accept
    const virtualModules = new VirtualModulesPlugin({
      [path.join(
        paths.appSrc,
        'index.js'
      )]: `export * from "./main.js"; if(module.hot) module.hot.accept();`,
    });

    config.plugins.push(virtualModules);
    config.devtool = 'eval-source-map';

    // config.plugins.push(
    //   new webpack.EvalSourceMapDevToolPlugin({
    //     exclude: /node_modules/,
    //     // moduleFilenameTemplate :
    //     protocol :
    //     // publicPath: `/pkg/sourcemap/${port}/`,
    //     // filename: '[file].map[query]',
    //   })
    // );

    const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
    let mod = false;
    const useTypeScript = fs.existsSync(paths.appTsConfig);
    const urls = prepareUrls(
      protocol,
      HOST,
      port,
      paths.publicUrlOrPath.slice(0, -1)
    );
    // Create a webpack compiler that is configured with custom messages.
    const compiler = createCompiler({
      appName,
      config,
      urls,
      useYarn,
      useTypeScript,
      webpack,
    });

    // compiler.hooks.watchRun.tap('WatchRun', comp => {
    //   if (!mod && comp.modifiedFiles) {
    //     for (let file of comp.modifiedFiles) {
    //       if (fileRegex.test(file)) {
    //         mod = true;
    //         break;
    //       }
    //     }
    //   }
    // });
    compiler.hooks.compilation.tap('MyPlugin', comp => {
      // console.log(compilationParams);
      // if (!mod && comp.modifiedFiles) {
      //   for (let file of comp.modifiedFiles) {
      //     if (fileRegex.test(file)) {
      //       mod = true;
      //       break;
      //     }
      //   }
      // }
      // if (!mod && comp.removedFiles) {
      //   for (let file of comp.removedFiles) {
      //     if (fileRegex.test(file)) {
      //       mod = true;
      //       break;
      //     }
      //   }
      // }
      // console.log(mod);
      // if (mod) {
      // mod = false;
      virtualModules.writeModule(
        path.join(paths.appSrc, 'main.js'),
        generatorEntryDev()
      );
      // }
    });

    // Load proxy config
    const proxySetting = require(paths.appPackageJson).proxy;
    const proxyConfig = prepareProxy(
      proxySetting,
      paths.appPublic,
      paths.publicUrlOrPath
    );
    // Serve webpack assets generated by the compiler over a web server.
    const serverConfig = {
      ...createDevServerConfig(proxyConfig, urls.lanUrlForConfig),
      host: HOST,
      port,
      // liveReload: false,
    };
    const devServer = new WebpackDevServer(serverConfig, compiler);
    // Launch WebpackDevServer.
    let fsWatcher;
    devServer.startCallback(() => {
      if (isInteractive) {
        clearConsole();
      }

      if (env.raw.FAST_REFRESH && semver.lt(react.version, '16.10.0')) {
        console.log(
          chalk.yellow(
            `Fast Refresh requires React 16.10 or higher. You are using React ${react.version}.`
          )
        );
      }

      console.log(chalk.cyan('Starting the development server...\n'));
      fsWatcher = chokidar.watch(path.join(paths.appSrc, 'nodes/**/+*.js'), {
        persistent: false,
        ignoreInitial: true,
      });

      let timer;
      fsWatcher
        .on('add', () => {
          mod = true;
          timer = setTimeout(() => {
            if (mod)
              virtualModules.writeModule(
                path.join(paths.appSrc, 'main.js'),
                ''
              );
          }, 1000);
        })
        .on('unlink', () => {
          mod = false;
          clearTimeout(timer);
        });
      // openBrowser(urls.localUrlForBrowser);
    });

    ['SIGINT', 'SIGTERM'].forEach(function (sig) {
      process.on(sig, function () {
        fsWatcher.close();
        devServer.close();
        process.exit();
      });
    });

    if (process.env.CI !== 'true') {
      // Gracefully exit when stdin ends
      process.stdin.on('end', function () {
        fsWatcher.close();
        devServer.close();
        process.exit();
      });
    }
  })
  .catch(err => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });
