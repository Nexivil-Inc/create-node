'use strict';
const crypto = require('crypto');
const ZstdCodec = require('@liradb2000/zstd-codec/lib/zstd-stream');
// const chalk = require('chalk');
const tar = require('tar');
const fs = require('fs-extra');
const path = require('path');
const paths = require('../config/paths');
// const { Writable } = require('stream');
process.on('unhandledRejection', err => {
  throw err;
});

const nameRegex = new RegExp(/^(?:@(?<namespace>\w+)\/)?(?<name>.+)$/);
const XNODE_MAGIC_NUMBER = Buffer.from([0x58, 0x4e, 0x30, 0x44, 0x65], 'hex');
// magicNumber; //XN0De
// 32; //name
// 193; //empty (future)
// 32; //integrity
// 32; //deps;
// 32; //downloader (origin:80)

// 12; //vi

// function recursiveFileList(startPath) {
//   const dirInfo = fs.readdirSync(paths.appPath, { withFileTypes: true });
//   for (let info of dirInfo) {
//     if (info.isDirectory()) recursiveFileList(path.join(startPath, info.name));
//   }
//   return dirInfo;
// }
const packInfo = require(paths.appPackageJson);
const { name = '' } = nameRegex.exec(packInfo.name)?.groups ?? {};

function packList() {
  const mergeFiles = new Set(
    packInfo.files.map(filepath => path.join('.', filepath))
  );

  mergeFiles.add('package.json');
  if (packInfo.readme) mergeFiles.add(path.join('.', packInfo.readme));
  // console.log(mergeFiles);
  const compressPromise = new Promise(resolve => {
    ZstdCodec.run(streams => {
      //   const streaming = new zstd.Streaming();
      const ZstdCompressTransform = streams.ZstdCompressTransform;
      const second_compress = new ZstdCompressTransform(22);
      const sink = fs.createWriteStream(
        path.join(paths.appPath, `${name}-${packInfo.version}.xnode`)
      );
      const nameBuffer = Buffer.alloc(326);
      nameBuffer.fill(XNODE_MAGIC_NUMBER, 0, 5);
      nameBuffer.fill(
        crypto
          .createHash('sha256')
          .update(packInfo.name.replace('@', ''))
          .digest(),
        5,
        37
      );
      //   nameBuffer.write(packInfo.name, 6, 'utf-8'); // set integrity pos
      sink.write(nameBuffer);
      sink.on('finish', function () {
        resolve();
      });
      //   const wrtiableStreamZstd = new Writable({
      //     write: function (chunk, _, cb) {
      //       streaming.push(chunk);
      //       cb();
      //     },
      //     final: function (cb) {
      //       streaming.push(null);
      //       cb();
      //     },
      //   });
      tar
        .c({ gzip: false }, [...mergeFiles])
        .pipe(second_compress)
        .pipe(sink);
    });
  });
  return compressPromise;
  //   return Promise.all(tarEntry);
}

function injectIntegrity() {
  const integrity = crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(
        path.join(paths.appPath, `${name}-${packInfo.version}.xnode`)
      )
    )
    .digest();
  const fd = fs.openSync(
    path.join(paths.appPath, `${name}-${packInfo.version}.xnode`),
    'r+'
  );
  fs.writeSync(fd, integrity, 0, 32, 230);
  fs.closeSync(fd);
}

function packer() {
  return packList()
    .then(injectIntegrity)
    .then(() => console.log('done'));
  //   return new Promise((resolve, reject) => {
  //     console.log(recursiveFileList());
  //     resolve();
  //     // const pack = tar.pack(); // pack is a streams2 stream
  //     // dirInfo.
  //     // // add a file called my-test.txt with the content "Hello World!"
  //     // pack.entry({ name: 'my-test.txt' }, 'Hello World!');
  //     // // add a file called my-stream-test.txt from a stream
  //     // var entry = pack.entry(
  //     //   { name: 'my-stream-test.txt', size: 11 },
  //     //   function (err) {
  //     //     // the stream was added
  //     //     // no more entries
  //     //     pack.finalize();
  //     //   }
  //     // );
  //     // entry.write('hello');
  //     // entry.write(' ');
  //     // entry.write('world');
  //     // entry.end();
  //     // // pipe the pack stream somewhere
  //     // pack.pipe(process.stdout);
  //   });
}

packer();
