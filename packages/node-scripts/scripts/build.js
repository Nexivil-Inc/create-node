"use strict";

const chalk = require("chalk");
const { builder } = require("./plugins/builder");

console.log("Creating an optimized production build...");
builder().then(() => console.log(chalk.green("Build Successfully!")));
