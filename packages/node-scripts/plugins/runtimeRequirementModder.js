/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

'use strict';

const { runtime } = require('webpack');

class RuntimeRequirementModder {
  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'RuntimeRequirementModderPlugin',
      compilation => {
        compilation.hooks.runtimeRequirementInTree
          .for(runtime.RuntimeGlobals.require)
          .tap('RuntimeRequirementModderPlugin', (chunk, set) => {
            // set.add(runtime.RuntimeGlobals.externalInstallChunk);
            set.add(runtime.RuntimeGlobals.ensureChunk);
            set.add(runtime.RuntimeGlobals.ensureChunkHandlers);
            set.add(runtime.RuntimeGlobals.onChunksLoaded);
            // set.add(runtime.RuntimeGlobals.hmrDownloadUpdateHandlers);
            set.add(runtime.RuntimeGlobals.getChunkScriptFilename);
            set.add(runtime.RuntimeGlobals.moduleFactoriesAddOnly);
            set.add(runtime.RuntimeGlobals.hasOwnProperty);
          });
      }
    );
  }
}

module.exports = RuntimeRequirementModder;
