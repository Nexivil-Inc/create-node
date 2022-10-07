/* eslint-disable no-extra-boolean-cast */
'use strict';

process.on('unhandledRejection', err => {
  throw err;
});

const path = require('path');
const https = require('https');
const chalk = require('chalk');
const crypto = require('crypto');
const { readFileSync, existsSync } = require('fs');
const ZstdCodec = require('@liradb2000/zstd-codec/lib/zstd-codec');

const { objectToFormData } = require('../utils/obj2formData');
const { getAuth } = require('../utils/credentials');
const paths = require('../config/paths');
const isLocalhost = process.env.localhost?.trim().toLowerCase() === 'true';
const emailRegx = new RegExp(
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
);
const nameRegex = new RegExp(/^(?:@(?<scope>\w+)\/)?(?<name>.+)$/);
const XNODE_MAGIC_NUMBER = Buffer.from([0x58, 0x4e, 0x30, 0x44, 0x65], 'hex');

// console.log("Creating an optimized production build...");

async function publisher() {
  const packInfo = require(paths.appPackageJson);
  // Publish to server(design-express)
  const { name: packName, version, readme = null, ..._packInfo } = packInfo;

  const { scope: _scope, name } = nameRegex.exec(packName)?.groups ?? {};
  const { user, token } = await getAuth();
  const scope = !!_scope ? _scope.replace('@', '') : user;

  if (!name || !user || !token) {
    chalk.redBright('something wrong.');
    return;
  }

  const bin = readFileSync(
    path.join(paths.appPath, `${name}-${version}.xnode`)
  );
  const magicNumber = bin.subarray(0, 5);
  if (!XNODE_MAGIC_NUMBER.equals(magicNumber)) throw new Error('not xnode');
  let readmeBin = null;

  if (!!readme) {
    const readmePath = path.resolve(paths.appPath, readme);
    if (existsSync(readmePath))
      readmeBin = await new Promise(r => {
        ZstdCodec.run(zstd => {
          const streaming = new zstd.Streaming();
          const data = readFileSync(readmePath);
          r(streaming.compress(data, 6));
        });
      });
    delete packInfo['readme'];
  } else {
    const readmePath = path.resolve(paths.appPath, 'readme.md');
    if (existsSync(readmePath))
      readmeBin = await new Promise(r => {
        ZstdCodec.run(zstd => {
          const streaming = new zstd.Streaming();
          const data = readFileSync(readmePath);
          r(streaming.compress(data, 6));
        });
      });
  }

  const form = new objectToFormData(_packInfo, {
    booleansAsIntegers: true,
  });

  let integrity = crypto.createHash('sha1').update(bin).digest('hex');

  form.append('scope', scope);
  form.append('name', name);
  form.append('version', version);
  form.append('integrity', integrity);
  form.append('release_type', 'NODE');
  form.append('x_version', '1');
  if (!readmeBin && (readmeBin.length ?? 0) > 0) {
    form.append('read_me', readmeBin, {
      filename: `${name}-${version}-readme.md`,
      contentType: 'application/octet-stream',
      knownLength: readmeBin.length,
    });
  }
  form.append('tgz_file', bin, {
    filename: `${name}-${version}.xnode`,
    contentType: 'nexivil/xnode',
    knownLength: bin.length,
  });
  // console.log(form);
  const httpsOptions = {
    method: 'POST',
    hostname: isLocalhost ? 'localhost' : 'x.nexivil.com',
    // hostname: 'x.nexivil.com',
    port: isLocalhost ? 8005 : 443,
    // port: 443,
    path: '/-/package/',
    headers: {
      ...form.getHeaders(),
      'Content-Length': form.getLengthSync(),
      Authorization: `Basic ${Buffer.from(user + ':' + token, 'utf8').toString(
        'base64'
      )}`,
    },
  };
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const req = https.request(httpsOptions, res => {
    console.log(`statusCode: ${res.statusCode}`);

    res.on('data', d => {
      process.stdout.write(d);
    });
  });

  req.on('error', error => {
    console.error(error);
  });
  // form.pipe(req);
  req.write(form.getBuffer());
  req.end();
}

publisher();
