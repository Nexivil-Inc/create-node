class DisableHarmonyPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap(
      'DisableHarmonyPlugin',
      (compilation, { normalModuleFactory }) => {
        const handler = (parser, parserOptions) => {
          parserOptions.harmony = false;
        };

        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap('HarmonyModulesPlugin', handler);
        // normalModuleFactory.hooks.parser
        //   .for('javascript/esm')
        //   .tap('HarmonyModulesPlugin', handler);
      }
    );
  }
}

module.exports = DisableHarmonyPlugin;
