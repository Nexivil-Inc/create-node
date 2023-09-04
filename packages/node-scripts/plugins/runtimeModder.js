// import * as prettier from 'prettier';
const { RuntimeGlobals } = require('webpack');

const pluginName = 'RuntimeModderPlugin';

class RuntimeModder {
  apply(compiler) {
    try {
      // compiler.hooks.make.tap('MyPlugin', compilation => {
      //   const runtimeConditionExpression =
      //     compilation.runtimeTemplate.runtimeConditionExpression;
      //   compilation.runtimeTemplate.runtimeConditionExpression =
      //     chunk => {
      //       const condition = runtimeConditionExpression(chunk);
      //       console.log(condition);
      //       return "assadsad";
      //     };
      // });

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

    const removeConditionOld = new RegExp(
      /(\w\.f\.j=.+else if)(\(666!=t\))([^=]+=fetcher)/
    );
    const removeConditionNew = new RegExp(
      /(\w\.f\.j=.+\.push\([^)]+\);)(else if\(\/\^.+\$\/\.test\([^)]+\)[^;]+;)(else[^=]+=fetcher)/
    );
    compiler.hooks.emit.tapAsync('ReplacePlugin', (compilation, callback) => {
      Object.keys(compilation.assets).forEach(filename => {
        if (filename === 'runtime.js') {
          let source = compilation.assets[filename].source();
          source = source.replace(removeConditionOld, '$1(true)$3');
          source = source.replace(removeConditionNew, '$1$3');

          compilation.assets[filename] = {
            source: () => source,
            size: () => source.length,
          };
        }
      });

      callback();
    });
  }
}
module.exports = RuntimeModder;
