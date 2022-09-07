'use strict';
const crypto = require('crypto');
const ZstdCodec = require('@liradb2000/zstd-codec/lib/zstd-stream');
const chalk = require('chalk');
const tar = require('tar');
const fs = require('fs-extra');
const path = require('path');
const paths = require('../config/paths');
// const { Writable } = require('stream');
process.on('unhandledRejection', err => {
  throw err;
});

const XNODE_MAGIC_NUMBER = Buffer.from([0x58, 0x4e, 0x30, 0x44, 0x65], 'hex'); //XN0De
// 220; //name
// 16; //integrity

function recursiveFileList(startPath) {
  const dirInfo = fs.readdirSync(paths.appPath, { withFileTypes: true });
  for (let info of dirInfo) {
    if (info.isDirectory()) recursiveFileList(path.join(startPath, info.name));
  }
  return dirInfo;
}

function packList() {
  const packInfo = require(paths.appPackageJson);
  const mergeFiles = new Set(
    packInfo.files.map(filepath => path.join('.', filepath))
  );

  mergeFiles.add('package.json');
  if (packInfo.readme) mergeFiles.add(path.join('.', packInfo.readme));
  console.log(mergeFiles);
  const compressPromise = new Promise(resolve => {
    ZstdCodec.run(streams => {
      //   const streaming = new zstd.Streaming();
      const ZstdCompressTransform = streams.ZstdCompressTransform;
      const second_compress = new ZstdCompressTransform(22);
      const sink = fs.createWriteStream(
        path.join(paths.appPath, 'build.xnode')
      );
      const nameBuffer = Buffer.alloc(241);
      nameBuffer.fill(XNODE_MAGIC_NUMBER, 0, 5);
      nameBuffer.write(packInfo.name.replace('@', ''), 5, 'utf-8');
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

function packer() {
  return packList().then(() => console.log('done'));
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
