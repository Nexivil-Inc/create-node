'use strict';
// `node-scripts pack` — build/ (+ README) → <name>-<version>.xnode:
//   "XN0De" (5) | sha256(package name without "@") (32) | … | integrity sha256(body) at 230 (32) | … (326 bytes header)
//   body = zstd(tar(build/, README.md))
// The README is part of the pack: Fabrica shows it on the xnode details page.

process.on('unhandledRejection', err => {
  throw err;
});

const crypto = require('crypto');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const tar = require('tar');
const fs = require('fs');
const path = require('path');
const paths = require('../config/paths');

const HEADER_SIZE = 326;
const INTEGRITY_OFFSET = 230;
const XNODE_MAGIC_NUMBER = Buffer.from([0x58, 0x4e, 0x30, 0x44, 0x65]); // "XN0De"

const packInfo = require(paths.appPackageJson);
const name = packInfo.name.replace(/^@[^/]+\//, '');
const output = path.join(paths.appPath, `${name}-${packInfo.version}.xnode`);

/** package.json "readme" when it exists, else README.md / readme.md / Readme.md. */
function readmeFile() {
  const candidates = [packInfo.readme, 'README.md', 'readme.md', 'Readme.md'].filter(Boolean);
  return candidates.find(f => fs.existsSync(path.join(paths.appPath, f)));
}

async function pack() {
  if (!fs.existsSync(paths.appBuild)) {
    console.error(`Nothing to pack: ${path.relative(paths.appPath, paths.appBuild)}/ does not exist (run the build first).`);
    process.exit(1);
  }
  const header = Buffer.alloc(HEADER_SIZE);
  XNODE_MAGIC_NUMBER.copy(header, 0);
  crypto.createHash('sha256').update(packInfo.name.replace('@', '')).digest().copy(header, 5);

  const entries = [path.relative(paths.appPath, paths.appBuild)];
  const readme = readmeFile();
  if (readme) entries.push(readme);

  const sink = fs.createWriteStream(output);
  sink.write(header);
  await pipeline(
    tar.c({ gzip: false, portable: true, noMtime: true, preservePaths: false, cwd: paths.appPath }, entries),
    zlib.createZstdCompress({ params: { [zlib.constants.ZSTD_c_compressionLevel]: 3 } }),
    sink,
  );

  // integrity = sha256(body), written into the header
  const integrity = crypto.createHash('sha256').update(fs.readFileSync(output).subarray(HEADER_SIZE)).digest();
  const fd = fs.openSync(output, 'r+');
  fs.writeSync(fd, integrity, 0, 32, INTEGRITY_OFFSET);
  fs.closeSync(fd);
  console.log(integrity.toString('hex'));
  console.log(`${path.basename(output)}${readme ? ` (with ${readme})` : ''}`);
  console.log('done');
}

pack();
