'use strict';
// Production runtime.js for the Fabrica xnode installer (Extensions litegraph func/installer xnodeFileInstaller):
//  - __webpack_require__.u (chunk script filename) returns the chunk id, and the installer receives ensureChunk
//    through x_fi(): chunks are fetched by the installer's fetcher("./<id>") from the package (manifest fileMap);
//  - the jsonp chunk handler always loads through fetcher (no "is this chunk on the current origin" condition);
//  - import.meta.url is not available where the runtime is evaluated;
//  - chunk fields are named __webpack_ids__/__webpack_modules__/__webpack_runtime__ (what arrayPush2import sets).
// The replacements run on the MINIFIED runtime, so they depend on webpack's runtime templates and terser's output.
// Every pattern is verified: if one stops matching after a toolchain update the build fails instead of producing a
// runtime the installer cannot load.
const { runtime } = require('webpack');

const pluginName = 'RuntimeModderPlugin';

// fetcher(<publicPath>+<filename>) → fetcher("./"+<filename>): webpack ≤5.105 emitted `=fetcher(o.p+o.u(t))`,
// webpack 5.113 emits `fetcher("./"+r.p+r.u(t))`.
const relativeImport = /fetcher\((?:"\.\/"\+)?\w\.p\+/g;
const removeImportMeta = /new URL\([^,]+,\s*import\.meta\.url\)/;
const renameWebpackRel = /\.__webpack_[^_]+_([^_]+)__/gm;
const renameWebpackESMRel = /__webpack_[^_]+_([^_]+)__:/gm;

/**
 * Remove the "does this chunk have JS on this origin" guard of the jsonp chunk handler:
 *   o.f.j=(t,i)=>{…if(a)i.push(a[1]);else if(<cond>){…fetcher…}else e[t]=0}  →  …else{…fetcher…}else e[t]=0}
 * <cond> differs between webpack versions (`123!=t`, `98==t`, `/^(1|2)$/.test(t)`), so it is matched by balancing
 * parentheses instead of a regex. Returns undefined when the handler has no guard.
 */
function removeChunkGuard(code) {
  const handler = code.search(/\w\.f\.j=/);
  if (handler < 0) return undefined;
  const at = code.indexOf('else if(', handler);
  const end = code.indexOf('.O.j=', handler);
  if (at < 0 || (end >= 0 && at > end)) return undefined;
  let depth = 0;
  let i = at + 'else if'.length;
  for (; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')' && --depth === 0) break;
  }
  if (depth !== 0 || !code.slice(at, i).length) return undefined;
  return code.slice(0, at) + 'else' + code.slice(i + 1);
}

function patchRuntime(src) {
  const problems = [];
  let out = src.replace(relativeImport, 'fetcher("./"+');
  const guarded = removeChunkGuard(out);
  if (guarded !== undefined) out = guarded;
  out = out.replace(removeImportMeta, '""');
  out = out.replaceAll(renameWebpackRel, '.__webpack_$1__');
  out = out.replaceAll(renameWebpackESMRel, '__webpack_$1__:');

  if (/\w\.f\.j=/.test(out) && !out.includes('fetcher("./"+')) problems.push('chunks are not loaded through fetcher("./"+id)');
  if (out.includes('import.meta')) problems.push('import.meta is still used');
  if (!/x_fi\(\w+\.e\)/.test(out)) problems.push('x_fi(ensureChunk) is missing');
  return { out, problems };
}

class RuntimeModder {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(pluginName, compilation => {
      const { mainTemplate, runtimeTemplate } = compilation;
      // Inject the overrides into the runtime bootstrap (after __webpack_require__.u is defined).
      mainTemplate.hooks.localVars.tap({ name: pluginName, stage: 1 }, source => {
        const script = runtimeTemplate.iife(
          '',
          `// Override __webpack_require__ methods
if(typeof ${runtime.RuntimeGlobals.require} !== "undefined") {
  // Override GetChunkName
  ${runtime.RuntimeGlobals.getChunkScriptFilename} = (chunkId) => chunkId;

  // export ensureChunk
  x_fi(${runtime.RuntimeGlobals.ensureChunk});
}`,
        );
        return source + script + ';';
      });
    });

    compiler.hooks.compilation.tap(pluginName, compilation => {
      const { sources, WebpackError } = compilation.compiler.webpack;
      compilation.hooks.afterProcessAssets.tap(pluginName, assets => {
        const source = assets['runtime.js'];
        if (!source) return;
        const { out, problems } = patchRuntime(source.source().toString());
        for (const p of problems) {
          compilation.errors.push(
            new WebpackError(`[node-scripts] runtime.js for the Fabrica installer: ${p}. The webpack/terser runtime output changed — update plugins/runtimeModder.js.`),
          );
        }
        compilation.updateAsset('runtime.js', new sources.RawSource(out));
      });
    });
  }
}

module.exports = RuntimeModder;
module.exports.patchRuntime = patchRuntime;
