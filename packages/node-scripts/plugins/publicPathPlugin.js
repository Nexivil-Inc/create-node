'use strict';
// Production publicPath of an xnode. build.js sets output.publicPath to the placeholder "__WEBPACK_DEFINE_PUBLIC_PATH__";
// after minification it is replaced in every emitted script with the URL the Fabrica installer serves the package
// under: new URL("/pkg/file/<sha256(name)>/build/", <origin>). The xapp packers (frontend "express", Fabrica VS Code)
// later rewrite the quoted "/pkg/file/<hash>/build/" literal, so its exact shape matters.
// Worker bundles (*.wjs) run in a worker scope: window → globalThis there.

const PLACEHOLDER = /["'`]__WEBPACK_DEFINE_PUBLIC_PATH__["'`]/g;
const WORKER_FILE = /(?:\/\w{20}\.worker|\.worker\.\w{8})\.wjs$/;
const SCRIPT_FILE = /\.js$/;

class PublicPathPlugin {
  /** @param {{ base: string }} options base = "/pkg/file/<sha256>/build/" */
  constructor({ base }) {
    this.base = base;
  }

  apply(compiler) {
    const { Compilation, sources } = compiler.webpack;
    compiler.hooks.thisCompilation.tap('PublicPathPlugin', compilation => {
      compilation.hooks.processAssets.tap(
        // before minification, at the stage the previous string replacer used (optimizeChunkAssets)
        { name: 'PublicPathPlugin', stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE },
        assets => {
          for (const name of Object.keys(assets)) {
            const worker = WORKER_FILE.test(name);
            if (!worker && !SCRIPT_FILE.test(name)) continue;
            const code = assets[name].source().toString();
            if (!PLACEHOLDER.test(code)) continue;
            PLACEHOLDER.lastIndex = 0;
            let out = code.replace(
              PLACEHOLDER,
              `new URL("${this.base}", ${worker ? 'globalThis' : 'window'}.location.origin).toString()`,
            );
            if (worker) out = out.replace(/(\b|\\t|\\n)window(\b|\\t|\\n)/g, (_, a, b) => `${a}globalThis${b}`);
            compilation.updateAsset(name, new sources.RawSource(out));
          }
        },
      );
    });
  }
}

module.exports = PublicPathPlugin;
