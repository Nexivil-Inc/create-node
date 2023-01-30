/* eslint-disable no-extra-boolean-cast */
'use strict';

process.on('unhandledRejection', err => {
  throw err;
});

const path = require('path');

const crypto = require('crypto');
const { readFileSync, } = require('fs');



const paths = require('../config/paths');

const nameRegex = new RegExp(/^(?:@(?<scope>\w+)\/)?(?<name>.+)$/);
const XNODE_MAGIC_NUMBER = Buffer.from([0x58, 0x4e, 0x30, 0x44, 0x65], 'hex');
const openBrowser = require('react-dev-utils/openBrowser');
const express = require('express');
const { choosePort } = require('react-dev-utils/WebpackDevServerUtils');
const cors = require('cors');

const FormData = require('form-data');

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5023;
const HOST = process.env.HOST || '0.0.0.0';

function startServer(port, data) {
  const key = crypto.randomUUID().replaceAll('-', '');
  const app = express();

  var corsOptions = {
    origin: 'https://x.nexivil.com',
    // origin: 'https://localhost:3001',
    methods: 'GET',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  };

  app.use(cors(corsOptions));
  app.get(`/${key}`, (req, res) => {
    Object.entries(data.getHeaders()).forEach(([k, v]) => res.setHeader(k, v));

    res.send(data.getBuffer());
    server.close();
  });

  const server = app.listen(port, () => {
    console.log('Continue ...');
    try {
      openBrowser(`https://x.nexivil.com/upload/nodes?q=${key}&p=${port}`);
      // openBrowser(`https://localhost:3001/upload/nodes?q=${key}&p=${port}`);
    } catch {}

    console.log(` ${port}`);
  });

  process.on('SIGTERM', () => {
    try {
      console.log('term');
      server.close();
    } catch {}
  });
}

async function publisher() {
  // Get Info from package.json
  const form = new FormData();
  const packInfo = require(paths.appPackageJson);
  const {
    name: packName,
    version,
    readme = null,
    keywords = [],
    ..._packInfo
  } = packInfo;
  form.append('version', version, { contentType: 'text/plain' });
  keywords.forEach(k =>
    form.append('keywords', k, { contentType: 'text/plain' })
  );

  // Split Scope and XNodes Name
  const { scope, name } = nameRegex.exec(packName)?.groups ?? {};
  form.append('scope', scope, { contentType: 'text/plain' });
  form.append('name', name, { contentType: 'text/plain' });

  // Get XNodes file and Check it.
  const bin = readFileSync(
    path.join(paths.appPath, `${name}-${version}.xnode`)
  );

  const magicNumber = bin.subarray(0, 5);
  if (!XNODE_MAGIC_NUMBER.equals(magicNumber)) throw new Error('not xnode');
  form.append('tgz_file', bin, {
    filename: `${name}-${version}.xnode`,
    contentType: 'nexivil/xnode',
    knownLength: bin.length,
  });

  let integrity = crypto
    .createHash('sha256')
    .update(bin.subarray(326))
    .digest('hex');
  if (integrity !== bin.subarray(230, 262).toString('hex'))
    throw new Error('try again');
  form.append('integrity', integrity, { contentType: 'text/plain' });

  let readmeBin = null;
  if (!!readme) {
    const readmePath = path.resolve(paths.appPath, readme);
    readmeBin = readFileSync(readmePath, 'utf-8');
  }
  if (!!readmeBin) {
    form.append('description', readmeBin, { contentType: 'text/plain' });
  }

  // console.log(form);
  // const httpsOptions = {
  //   method: 'POST',
  //   hostname: isLocalhost ? 'localhost' : 'x.nexivil.com',
  //   // hostname: 'x.nexivil.com',
  //   port: isLocalhost ? 8003 : 443,
  //   // port: 443,
  //   path: '/v1/extension/',
  //   headers: {
  //     ...form.getHeaders(),
  //     'Content-Length': form.getLengthSync(),
  //     Authorization: `Basic ${Buffer.from(user + ':' + token, 'utf8').toString(
  //       'base64'
  //     )}`,
  //   },
  // };

  choosePort(HOST, DEFAULT_PORT).then(p => startServer(p, form));

  // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  // const req = https.request(httpsOptions, res => {
  //   console.log(`statusCode: ${res.statusCode}`);

  //   res.on('data', d => {
  //     process.stdout.write(d);
  //   });
  // });

  // req.on('error', error => {
  //   console.error(error);
  // });
  // // form.pipe(req);
  // req.write(form.getBuffer());
  // req.end();
}

publisher();
