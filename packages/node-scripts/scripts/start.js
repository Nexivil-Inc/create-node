#!/usr/bin/env node
"use strict";

const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const { readFileSync, existsSync } = require("fs");
const { List } = require("immutable");

const loadConfigFile = require("rollup/dist/loadConfigFile.js");
const rollup = require("rollup");
const { appPath } = require("../config/paths");
const { replaceMap } = require("../utils/replaceMap");

const app = express();

//initialize a simple http server
const server = http.createServer(app);

app.get("/bundle.js.map", function (req, res) {
    res.sendFile(path.resolve(appPath, "build/bundle.js.map"));
});

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

const watcherPromise = loadConfigFile(
    path.resolve(appPath, "rollup.config.js"),
    {
        watch: {
            include: "src/**",
        },
    }
).then(async ({ options, warnings }) => {
    // "warnings" wraps the default `onwarn` handler passed by the CLI.
    // This prints all warnings up to this point:
    console.log(`We currently have ${warnings.count} warnings`);

    // This prints all deferred warnings
    warnings.flush();

    // // options is an array of "inputOptions" objects with an additional "output"
    // // property that contains an array of "outputOptions".
    // // The following will generate all outputs for all inputs, and write them to disk the same
    // // way the CLI does it:
    // for (const optionsObj of options) {
    //   const bundle = await rollup.rollup(optionsObj);
    //   await Promise.all(optionsObj.output.map(bundle.write));
    // }

    // You can also pass this directly to "rollup.watch"
    // console.log(options[0].output);
    return rollup.watch(options);
});

//start our server
watcherPromise
    .then(watcher => {
        const webSockets = { list: List([]) };
        wss.on("connection", ws => {
            //connection is up, let's add a simple simple event
            ws.on("message", message => {
                //log the received message and send it back to the client
                console.log("received: %s", message);

                if (existsSync(path.resolve(appPath, "build/bundle.js"))) {
                    const binary = replaceMap(
                        readFileSync(path.resolve(appPath, "build/bundle.js"), {
                            encoding: "utf-8",
                        })
                    );
                    ws.send(binary);
                } else {
                    ws.send(`Hello, you sent -> ${message}`);
                }
            });

            function sendBundle(binary) {
                ws.send(binary);
            }

            ws.on("close", () => {
                webSockets.list = webSockets.list.delete(
                    webSockets.list.indexOf(sendBundle)
                );
            });

            //send immediatly a feedback to the incoming connection
            console.log(`\x1b[32m%s\x1b[0m`, "Connected!");
            webSockets.list = webSockets.list.push(sendBundle);
        });

        watcher.on("event", e => {
            if (e.code === "END") {
                console.log(`\x1b[32m%s\x1b[0m`, "Build Successfully!");
                const binary = replaceMap(
                    readFileSync(path.resolve(appPath, "build/bundle.js"), {
                        encoding: "utf-8",
                    })
                );

                webSockets.list.forEach(v => v(binary));
            }
        });

        watcher.on("event", e => {
            if (e.code === "ERROR") {
                console.log(
                    `\x1b[31m%s\x1b[0m`,
                    `[${e.error.name}]${e.error.message}`
                );
                console.log(e.error.frame);
            }
        });

        watcher.on("event", ({ result }) => {
            if (result) {
                result.close();
            }
        });

        server.listen(process.env.PORT || 8999, () => {
            console.clear();
            console.log(`Please Connect with Design Express :)`);
        });

        if (process.platform === "win32") {
            var rl = require("readline").createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            rl.on("SIGINT", function () {
                process.emit("SIGINT");
            });
        }

        process.on("SIGINT", function () {
            //graceful shutdown
            wss.close(() => {
                server.close(() => {
                    watcher.close();
                    console.log("Process terminated");
                    process.exit();
                });
            });
        });
    })
    .catch(e => console.log(e));
