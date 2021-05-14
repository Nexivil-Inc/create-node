"use strict";

process.on("unhandledRejection", err => {
    throw err;
});

const { builder } = require("./plugins/builder");
const { packer } = require("./plugins/packer");

console.log("Creating an optimized production build...");

builder().then(options => packer(options));
