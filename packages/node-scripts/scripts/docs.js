'use strict';
// `node-scripts docs` — docs/index.md from the JSDoc comments of src/**/*.js.

const path = require('path');
const { writeFileSync, mkdirSync } = require('fs');

const chalk = require('../utils/colors');
const jsdoc2md = require('jsdoc-to-markdown');

const { appPath } = require('../config/paths');

async function main() {
  console.log(chalk.green('Generating documents...'));
  const docs = await jsdoc2md.render({
    plugin: path.join(__dirname, 'plugins', 'docs', 'index.js'),
    files: path.resolve(appPath, './src/**/*.js'),
    'module-index-format': 'grouped',
    'global-index-format': 'grouped',
  });
  mkdirSync(path.resolve(appPath, 'docs'), { recursive: true });
  writeFileSync(path.resolve(appPath, 'docs/index.md'), docs);
  console.log(chalk.green('docs/index.md written.'));
}

main().catch(err => {
  console.error(chalk.red(err.stack || err));
  process.exit(1);
});
