/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

'use strict';

const { RuntimeGlobals } = require('webpack');

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
          .for(RuntimeGlobals.require)
          .tap('RuntimeRequirementModderPlugin', (chunk, set) => {
            // set.add(RuntimeGlobals.externalInstallChunk);
            set.add(RuntimeGlobals.ensureChunk);
            set.add(RuntimeGlobals.ensureChunkHandlers);
            set.add(RuntimeGlobals.onChunksLoaded);
            // set.add(RuntimeGlobals.hmrDownloadUpdateHandlers);
            set.add(RuntimeGlobals.getChunkScriptFilename);
            set.add(RuntimeGlobals.moduleFactoriesAddOnly);
            set.add(RuntimeGlobals.hasOwnProperty);
          });
      }
    );
  }
}

module.exports = RuntimeRequirementModder;
