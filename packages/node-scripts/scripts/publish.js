"use strict";

process.on("unhandledRejection", err => {
    throw err;
});

const http = require("http");
const chalk = require("chalk");
const crypto = require("crypto");

const { builder } = require("./plugins/builder");
const { packer } = require("./plugins/packer");
const { objectToFormData } = require("../utils/obj2formData");
const { getAuth } = require("../utils/credentials");

const emailRegx = new RegExp(
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
);

console.log("Creating an optimized production build...");

builder()
    .then(options => packer(options))
    .then(async ([bin, info]) => {
        // Publish to server(design-express)
        const { name, version, author } = info;
        let credential = null;

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

        const form = new objectToFormData(info, {
            booleansAsIntegers: true,
        });

        let integrity = crypto.createHash("sha1").update(bin).digest("hex");

        form.append("integrity", integrity);
        form.append("tgz_file", Buffer.from(bin), {
            filename: `${name}-${version}.xnode`,
            contentType: "nexivil/xnode",
            knownLength: bin.length,
        });

        const httpOptions = {
            method: "POST",
            hostname: "localhost",
            port: 8000,
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

        const req = http.request(httpOptions, res => {
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
