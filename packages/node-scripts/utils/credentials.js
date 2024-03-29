'use strict';

const keytar = require('keytar');
const chalk = require('chalk');
const readline = require('readline');
const isLocalhost = process.env.localhost?.trim().toLowerCase() === 'true';

const service = isLocalhost
  ? 'nexivil/design-express/v1/preview'
  : 'nexivil/design-express/v1';
// const service = 'nexivil/design-express/v1/stable';

async function setAuth() {
  let user, token;
  //   let token = await keytar.getPassword('nexivil/design-express', user);
  if (!user) {
    user = await new Promise(r => {
      let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      //   rl.stdoutMuted = true;

      rl.question(chalk.blueBright('Email: '), function (_user) {
        rl.close();
        r(_user);
      });

      rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (rl.stdoutMuted) rl.output.write('*');
        else rl.output.write(stringToWrite);
      };
    });
  }
  if (!token) {
    token = await new Promise(r => {
      let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.stdoutMuted = true;

      rl.question(chalk.blueBright('Access Token: '), function (_token) {
        rl.close();
        r(_token);
      });

      rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (rl.stdoutMuted) rl.output.write('*');
        else rl.output.write(stringToWrite);
      };
    });
    await keytar.setPassword(service, user, token);
  }
  return;
}

async function getAuth() {
  let user, token;
  let cred = await keytar.findCredentials(service);
  if (cred.length > 1) {
    user = await new Promise(r => {
      let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.stdoutMuted = true;
      console.log(chalk.blueBright('We found multiple saved accounts.\n'));
      console.log(chalk.blueBright('Please select a specific account.\n'));
      rl.question(chalk.blueBright('Email: '), function (_user) {
        rl.close();
        r(_user);
      });

      rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (rl.stdoutMuted) rl.output.write('*');
        else rl.output.write(stringToWrite);
      };
    });
    token = await keytar.getPassword(service, user);

    if (token === null) {
      console.log(chalk.redBright(`Cannot accesss a ${user} Credential.\n`));
      console.log(
        chalk.blueBright('npx @design-express/node-scripts setUser\n')
      );
      return;
    }
  } else {
    const { account, password } = cred[0];
    user = account;
    token = password;
  }
  //   console.log(cred);
  return { user, token };
}
module.exports = { getAuth, setAuth };
