"use strict";

const keytar = require("keytar");
const chalk = require("chalk");
const readline = require("readline");

async function getAuth(user) {
    let token = await keytar.getPassword("nexivil/design-express", user);
    if (token === null) {
        console.info(`${chalk.blueBright("Please login Email : ")}'${user}'`);
        token = await new Promise(r => {
            let rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            rl.stdoutMuted = true;

            rl.question("Access Token: ", function (_token) {
                rl.close();
                r(_token);
            });

            rl._writeToOutput = function _writeToOutput(stringToWrite) {
                if (rl.stdoutMuted) rl.output.write("*");
                else rl.output.write(stringToWrite);
            };
        });
        await keytar.setPassword("nexivil/design-express", user, token);
    }
    return token;
}
module.exports = { getAuth };
