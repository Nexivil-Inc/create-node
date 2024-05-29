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
  // console.log(mergeFiles);
  const compressPromise = new Promise(resolve => {
    ZstdCodec.run(streams => {
      //   const streaming = new zstd.Streaming();
      const ZstdCompressTransform = streams.ZstdCompressTransform;
      const second_compress = new ZstdCompressTransform(3);
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
      const packEntries = [path.relative(paths.appPath, paths.appBuild)];

      if (
        packInfo.readme &&
        fs.existsSync(path.join(paths.appPath, packInfo.readme))
      ) {
        packEntries.push(
          path.relative(
            paths.appPath,
            path.join(paths.appPath, packInfo.readme)
          )
        );
      }

      tar
        .c(
          {
            gzip: false,
            portable: true,
            noMtime: true,
            preservePaths: false,
            cwd: paths.appPath,
          },
          packEntries
        )
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
      fs
        .readFileSync(
          path.join(paths.appPath, `${name}-${packInfo.version}.xnode`)
        )
        .subarray(326)
    )
    .digest();
  console.log(integrity.toString('hex'));
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
