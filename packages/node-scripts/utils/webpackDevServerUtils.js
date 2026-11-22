'use strict';
// Compiler of `node-scripts start` with readable console output (based on create-react-app's WebpackDevServerUtils,
// (c) Facebook, MIT license). Types are not checked during the build (Babel strips them; the editor checks them).

const chalk = require('./colors');
const { clearConsole, formatWebpackMessages } = require('./devUtils');

const isInteractive = process.stdout.isTTY;

function printInstructions(appName, urls, port, useYarn) {
  console.log();
  console.log(`You can now connect ${chalk.bold(appName)} nodes in DESIGN EXPRESS.`);
  console.log();
  console.log(`  ${chalk.bold('link:')}            ${appName}:${port}`);
  console.log(`  ${chalk.bold('served at:')}       ${urls.localUrlForTerminal}`);
  if (urls.lanUrlForTerminal) console.log(`  ${chalk.bold('on your network:')} ${urls.lanUrlForTerminal}`);
  console.log();
  console.log('Note that the development build is not optimized.');
  console.log(`To create a production build, use ${chalk.cyan(`${useYarn ? 'yarn' : 'npm run'} build`)}.`);
  console.log();
}

function createCompiler({ appName, config, urls, port, useYarn, webpack }) {
  let compiler;
  try {
    compiler = webpack(config);
  } catch (err) {
    console.log(chalk.red('Failed to compile.'));
    console.log();
    console.log(err.message || err);
    console.log();
    process.exit(1);
  }

  compiler.hooks.invalid.tap('invalid', () => {
    if (isInteractive) clearConsole();
    console.log('Compiling...');
  });

  let isFirstCompile = true;
  compiler.hooks.done.tap('done', stats => {
    if (isInteractive) clearConsole();
    const messages = formatWebpackMessages(stats.toJson({ all: false, warnings: true, errors: true, moduleTrace: false }));
    const isSuccessful = !messages.errors.length && !messages.warnings.length;
    if (isSuccessful) console.log(chalk.green('Compiled successfully!'));
    if (isSuccessful && (isInteractive || isFirstCompile)) printInstructions(appName, urls, port, useYarn);
    isFirstCompile = false;

    if (messages.errors.length) {
      console.log(chalk.red('Failed to compile.\n'));
      console.log(messages.errors.slice(0, 1).join('\n\n'));
      return;
    }
    if (messages.warnings.length) {
      console.log(chalk.yellow('Compiled with warnings.\n'));
      console.log(messages.warnings.join('\n\n'));
      console.log();
    }
  });

  return compiler;
}

module.exports = {
  createCompiler,
};
