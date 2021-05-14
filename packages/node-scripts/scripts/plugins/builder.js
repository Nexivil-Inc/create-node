"use strict";

const path = require("path");

const loadConfigFile = require("rollup/dist/loadConfigFile.js");
const rollup = require("rollup");
const { terser } = require("rollup-plugin-terser");

const { appPath } = require("../../config/paths");

function builder() {
    return loadConfigFile(path.resolve(appPath, "rollup.config.js"), {
        format: "iife",
    }).then(async ({ options, warnings }) => {
        // "warnings" wraps the default `onwarn` handler passed by the CLI.
        // This prints all warnings up to this point:
        console.log(`We currently have ${warnings.count} warnings`);

        // This prints all deferred warnings
        warnings.flush();

        // options is an array of "inputOptions" objects with an additional "output"
        // property that contains an array of "outputOptions".
        // The following will generate all outputs for all inputs, and write them to disk the same
        // way the CLI does it:
        for (const optionsObj of options) {
            if (
                optionsObj.plugins.find(({ name }) => name === "terser") ===
                undefined
            )
                optionsObj.plugins.push(terser());
            const bundle = await rollup.rollup(optionsObj);
            await Promise.all(optionsObj.output.map(bundle.write));
        }
        return options;
    });
}

module.exports = { builder };
