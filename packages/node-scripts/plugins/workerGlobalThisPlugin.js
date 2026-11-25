'use strict';
// Worker code runs in a worker scope, where `window` does not exist. The globals transform (babel.config.js, globalKey
// "window") turns browser globals into `window.<name>` in every module a worker imports — only the *.worker.js entry
// itself is compiled with globalKey "globalThis". This rewrites `window` → `globalThis` in the scripts of each
// worker-loader child compilation, before worker-loader emits them (chunks/*.wjs) or inlines them (development:
// forceInline), so both builds get it; ReplaceSource keeps their source maps. PublicPathPlugin (production) also
// rewrites emitted *.wjs files, as the earlier string replacer did.

const WINDOW = /(\b|\\t|\\n)window(\b|\\t|\\n)/g; // \t / \n: inside eval("…") strings of development builds
const SCRIPT = /\.(?:m?js|wjs)$/;

class WorkerGlobalThisPlugin {
  apply(compiler) {
    // `compilation` taps are copied to child compilers (`thisCompilation` ones are not)
    compiler.hooks.compilation.tap('WorkerGlobalThisPlugin', compilation => {
      const child = compilation.compiler;
      if (!child.isChild() || !String(child.name).startsWith('worker-loader ')) return;
      const { Compilation, sources } = child.webpack;
      compilation.hooks.processAssets.tap(
        { name: 'WorkerGlobalThisPlugin', stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE },
        assets => {
          for (const name of Object.keys(assets)) {
            if (!SCRIPT.test(name)) continue;
            const original = assets[name];
            const code = original.source().toString();
            let replaced;
            WINDOW.lastIndex = 0;
            for (let m; (m = WINDOW.exec(code)); ) {
              replaced ??= new sources.ReplaceSource(original);
              const start = m.index + m[1].length;
              replaced.replace(start, start + 'window'.length - 1, 'globalThis'); // end is inclusive
            }
            if (replaced) compilation.updateAsset(name, replaced);
          }
        },
      );
    });
  }
}

module.exports = WorkerGlobalThisPlugin;
