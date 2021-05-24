"use strict";

process.on("unhandledRejection", err => {
    throw err;
});

const path = require("path");
const https = require("https");
const chalk = require("chalk");
const crypto = require("crypto");
const { readFileSync, existsSync } = require("fs");
const ZstdCodec = require("zstd-codec").ZstdCodec;

const { builder } = require("./plugins/builder");
const { packer } = require("./plugins/packer");
const { objectToFormData } = require("../utils/obj2formData");
const { getAuth } = require("../utils/credentials");
const { appPath } = require("../config/paths");

const emailRegx = new RegExp(
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
);

console.log("Creating an optimized production build...");

builder()
    .then(options => packer(options))
    .then(async ([bin, info]) => {
        // Publish to server(design-express)
        const { name, version, author, readme = null } = info;
        let credential = null;
        let readmeBin = null;

        if (!!author) {
            if (typeof author === "string" && emailRegx.test(author)) {
                credential = { user: author, token: await getAuth(author) };
            } else if (author.name && emailRegx.test(author.name)) {
                credential = {
                    user: author.name,
                    token: await getAuth(author.name),
                };
            } else if (author.email && emailRegx.test(author.email)) {
                credential = {
                    user: author.email,
                    token: await getAuth(author.email),
                };
            } else {
                console.error(chalk.red(`Cannot found 'author.email'`));
                return;
            }
        } else {
            console.error(chalk.red(`Cannot found 'author'`));
            return;
        }

        if (!!readme) {
            const readmePath = path.resolve(appPath, readme);
            if (existsSync(readmePath))
                readmeBin = await new Promise(r => {
                    ZstdCodec.run(zstd => {
                        const streaming = new zstd.Streaming();
                        const data = readFileSync(readmePath);
                        r(streaming.compress(data, 6));
                    });
                });
            delete info["readme"];
        } else {
            const readmePath = path.resolve(appPath, "readme.md");
            if (existsSync(readmePath))
                readmeBin = await new Promise(r => {
                    ZstdCodec.run(zstd => {
                        const streaming = new zstd.Streaming();
                        const data = readFileSync(readmePath);
                        r(streaming.compress(data, 6));
                    });
                });
        }

        const form = new objectToFormData(info, {
            booleansAsIntegers: true,
        });

        let integrity = crypto.createHash("sha1").update(bin).digest("hex");

        form.append("integrity", integrity);
        form.append("read_me", Buffer.from(readmeBin), {
            filename: `${name}-${version}-readme.md`,
            contentType: "application/octet-stream",
            knownLength: readmeBin.length,
        });
        form.append("tgz_file", Buffer.from(bin), {
            filename: `${name}-${version}.xnode`,
            contentType: "nexivil/xnode",
            knownLength: bin.length,
        });

        const httpsOptions = {
            method: "POST",
            hostname: "x.nexivil.com",
            port: 443,
            path: "/-/package/",
            headers: {
                ...form.getHeaders(),
                "Content-Length": form.getLengthSync(),
                Authorization: `Basic ${Buffer.from(
                    credential.user + ":" + credential.token,
                    "utf8"
                ).toString("base64")}`,
            },
        };

        const req = https.request(httpsOptions, res => {
            console.log(`statusCode: ${res.statusCode}`);

            res.on("data", d => {
                process.stdout.write(d);
            });
        });

        req.on("error", error => {
            // console.error(error);
        });
        // form.pipe(req);
        req.write(form.getBuffer());
        req.end();
    });
