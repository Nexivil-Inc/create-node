// import * as prettier from 'prettier';
const { RuntimeGlobals } = require('webpack');

const pluginName = 'RuntimeModderPlugin';

class RuntimeModder {
  apply(compiler) {
    try {
      compiler.hooks.thisCompilation.tap(pluginName, compilation => {
        const { mainTemplate, runtimeTemplate } = compilation;

        mainTemplate.hooks.localVars.tap(
          { name: pluginName, stage: 1 },
          source => {
            const script = runtimeTemplate.iife(
              '',
              `// Override __webpack_require__ methods
if(typeof ${RuntimeGlobals.require} !== "undefined") {
  // Override GetChunkName
  ${RuntimeGlobals.getChunkScriptFilename} = (chunkId) => chunkId;

  // export ensureChunk
  x_fi(${RuntimeGlobals.ensureChunk});
}`
            );
            return source + script + ';';
          }
        );
      });
    } catch (e) {
      console.error(e);
    }
  }
}
module.exports = RuntimeModder;
