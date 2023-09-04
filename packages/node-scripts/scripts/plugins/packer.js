'use strict';

const path = require('path');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const crypto = require('crypto');

const { encode } = require('cbor-x');
const chalk = require('chalk');

const ZstdCodec = require('zstd-codec').ZstdCodec;

const { appPath } = require('../../config/paths');

async function packer(options) {
  const result = options.map(option => option.output[0].file);

  if (result.length > 1) {
    console.error(`${chalk.bgRed('Error: ')} Cannot publish multiple files.`);
    return;
  }
  if (!existsSync(path.resolve(appPath, result[0]))) {
    console.error(
      chalk.red(`Cannot found ${path.resolve(appPath, result[0]).toString()}`)
    );
    return;
  }
  if (!existsSync(path.resolve(appPath, './package.json'))) {
    console.error(
      chalk.red(
        `Cannot found ${path.resolve(appPath, './package.json').toString()}`
      )
    );
    return;
  }

  const buildScript = readFileSync(path.resolve(appPath, result[0]), 'utf8');
  const packageInfo = readFileSync(
    path.resolve(appPath, './package.json'),
    'utf8'
  );
  const packInfo = JSON.parse(packageInfo);
  const { name: _name = null, version = null } = packInfo;
  if (!_name || !version) {
    console.error(
      chalk.red(`Cannot Parse 'name' or 'version' in package.json`)
    );
    return;
  }
  const { name = null, namespace = null } =
    /^(?:@(?<namespace>\w+)[/\/])?(?<name>\w+)$/.exec(_name).groups;

  if (!name) {
    console.error(chalk.red(`Cannot Parse 'name'  in package.json`));
    return;
  }

  let integrity = crypto.createHash('sha1').update(buildScript).digest('hex');
  let serializedAsBuffer = encode({
    integrity,
    script: buildScript,
  });
  // console.log(deserial.toString());
  const cpr = await new Promise(r =>
    ZstdCodec.run(zstd => {
      const streaming = new zstd.Streaming();
      const cpr = streaming.compress(serializedAsBuffer, 6);
      r(cpr);
    })
  );

  // writeFileSync()
  writeFileSync(
    path.resolve(
      appPath,
      `${!!namespace ? `${namespace}_` : ''}${name}-${version}.xnode`
    ),
    cpr
  );
  return [cpr, packInfo];
}
module.exports = { packer };
