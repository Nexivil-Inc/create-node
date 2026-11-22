/**
 * Babel preset of node-scripts (production / development builds of xnodes).
 * Originally based on https://github.com/mui/material-ui/blob/57c91aaf55fc24780daf2b7deceb8aab492975ac/babel.config.js
 * (c) 2014 Call-Em-All (MIT license) and create-react-app's babel-preset-react-app (c) Facebook (MIT license).
 *
 * Options (preset options in webpack.config.js):
 *   reactPreset     JSX with the React automatic runtime (default true, also for .js files)
 *   globalKey       global object name for @liradb2000/babel-plugin-transform-globals (default "window")
 *   typescript      @babel/preset-typescript (default true)
 */

const path = require('path');

const validateBoolOption = (name, value, defaultValue) => {
  if (typeof value === 'undefined') value = defaultValue;
  if (typeof value !== 'boolean') throw new Error(`node-scripts babel preset: '${name}' option must be a boolean.`);
  return value;
};

module.exports = function getBabelConfig(_api, opts = {}) {
  const env = process.env.BABEL_ENV || process.env.NODE_ENV;
  const isEnvDevelopment = env === 'development';
  const isEnvProduction = env === 'production';

  const useESModules = validateBoolOption('useESModules', opts.useESModules, isEnvDevelopment || isEnvProduction);
  const isTypeScriptEnabled = validateBoolOption('typescript', opts.typescript, true);
  const areHelpersEnabled = validateBoolOption('helpers', opts.helpers, true);
  const useAbsoluteRuntime = validateBoolOption('absoluteRuntime', opts.absoluteRuntime, true);
  // JSX is allowed in .js files too (xnode entries are often +name.js with JSX), so the React preset is on unless
  // `reactPreset: false` is passed explicitly (webpack.config's `useReactPreset` is informational only, as before).
  const useReactPreset = validateBoolOption('reactPreset', opts.reactPreset, true);
  const shouldUseReactRefresh = process.env.FAST_REFRESH !== 'false';
  const absoluteRuntimePath = useAbsoluteRuntime ? path.dirname(require.resolve('@babel/runtime/package.json')) : undefined;

  const presets = [
    (isEnvProduction || isEnvDevelopment) && [
      require('@babel/preset-env').default,
      {
        // Allow importing core-js in entrypoint and use browserslist to select polyfills
        useBuiltIns: 'entry',
        corejs: 3,
        // Exclude transforms that make all code slower
        exclude: ['transform-typeof-symbol'],
        modules: false,
      },
    ],
    useReactPreset && [
      require('@babel/preset-react').default,
      {
        // component stacks / __self in development
        development: isEnvDevelopment,
        runtime: 'automatic',
      },
    ],
    isTypeScriptEnabled && [require('@babel/preset-typescript').default],
  ].filter(Boolean);

  const plugins = [
    require('babel-plugin-macros'),
    require('babel-plugin-optimize-clsx'),
    require('../babel/noSideEffectClassProperties'),
    [require('@liradb2000/babel-plugin-transform-globals'), { replace: 'browser', globalKey: opts.globalKey ?? 'window' }],
    // Loose class fields / private members: Fabrica (litegraph's shallowObj) relies on loose private fields.
    [require('@babel/plugin-transform-class-properties').default, { loose: true }],
    [require('@babel/plugin-transform-private-methods').default, { loose: true }],
    [require('@babel/plugin-transform-private-property-in-object').default, { loose: true }],
    [require('@babel/plugin-transform-object-rest-spread').default, { loose: true }],
    [require('@babel/plugin-transform-optional-chaining').default, { loose: true }],
    [require('@babel/plugin-transform-nullish-coalescing-operator').default, { loose: true }],
    [require('@babel/plugin-transform-numeric-separator').default, { loose: true }],
    [
      require('@babel/plugin-transform-runtime'),
      {
        corejs: false,
        helpers: areHelpersEnabled,
        // babel assumes @babel/runtime 7.0.0-beta.0 otherwise (https://github.com/babel/babel/issues/10261)
        version: require('@babel/runtime/package.json').version,
        regenerator: true,
        useESModules,
        // encapsulate our @babel/runtime so the matching version is used
        absoluteRuntime: absoluteRuntimePath,
      },
    ],
    useReactPreset && [require('babel-plugin-transform-react-remove-prop-types').default, { mode: 'unsafe-wrap' }],
    useReactPreset && isEnvDevelopment && shouldUseReactRefresh && require.resolve('react-refresh/babel'),
    require('babel-plugin-annotate-pure-calls').default,
  ].filter(Boolean);

  return {
    assumptions: {
      noDocumentAll: true,
    },
    presets,
    plugins,
    overrides: [
      useReactPreset && {
        exclude: /\.test\.(js|ts|tsx)$/,
        plugins: [require('@babel/plugin-transform-react-constant-elements').default],
      },
    ].filter(Boolean),
  };
};
