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
      /(\w\.f\.j=.+else if)(\(\d{3}!=t\))([^=]+=fetcher)/
    );
    // const removeConditionNew = new RegExp(
    //   /(\w\.f\.j=.+\.push\([^)]+\);)(else if\(\/\^.+\$\/\.test\([^)]+\)[^;]+;)(else[^=]+=fetcher)/
    // );
    const removeConditionNew = new RegExp(
      /(\w\.f\.j=.+\.push\([^)]+\);)(else if.*)(\{[^=]+=fetcher)\((.*)"\.\/"\+/
    );
    const removeImportMeta = new RegExp(/new URL\([^,]+,\s*import\.meta\.url\)/);

    const replaceRelative = new RegExp(/=fetcher\((\w\.\w)\+/)

    compiler.hooks.compilation.tap('ReplacePlugin', compilation => {
      const sources = compilation.compiler.webpack.sources;
      compilation.hooks.afterProcessAssets.tap(
        {
          name: 'ReplacePlugin',
          // stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
        },
        assets => {
          Object.entries(assets).forEach(([pathname, source]) => {
            if (pathname === 'runtime.js') {
              let _src = source.source();
              _src = _src.replace(replaceRelative, '=fetcher("./"+');
              _src = _src.replace(removeConditionOld, '$1(true)$3');
              _src = _src.replace(removeConditionNew, '$1else$3("./"+');
              _src = _src.replace(removeImportMeta, '""');

              compilation.updateAsset(pathname, new sources.RawSource(_src));
            }
          });
        }
      );
    });
  }
}
module.exports = RuntimeModder;
