"use strict";

const path = require("path");
const { writeFileSync, mkdirSync, existsSync } = require("fs");

const chalk = require("chalk");
const jsdoc2md = require("jsdoc-to-markdown");

const { appPath } = require("../config/paths");

console.log(chalk.green("Generating documents..."));

const docs = jsdoc2md.renderSync({
    plugin: __dirname + "/plugins/docs/index.js",
    files: path.resolve(appPath, "./src/**/*.js"),
});
if (!existsSync(path.resolve(appPath, "docs")))
    mkdirSync(path.resolve(appPath, "docs"));
writeFileSync(path.resolve(appPath, "docs/index.md"), docs, { flag: "" });
