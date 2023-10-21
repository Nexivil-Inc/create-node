/**
 * Based heavily on https://github.com/mui/material-ui/blob/
 *  57c91aaf55fc24780daf2b7deceb8aab492975ac/babel.config.js
 * Original Copyright (c) 2014 Call-Em-All @mui (MIT license)
 */

const path = require('path');

const validateBoolOption = (name, value, defaultValue) => {
  if (typeof value === 'undefined') {
    value = defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`Preset react-app: '${name}' option must be a boolean.`);
  }

  return value;
};

const errorCodesPath = path.resolve(
  __dirname,
  './docs/public/static/error-codes.json'
);
const missingError =
  process.env.MUI_EXTRACT_ERROR_CODES === 'true' ? 'write' : 'annotate';

function resolveAliasPath(relativeToBabelConf) {
  const resolvedPath = path.relative(
    process.cwd(),
    path.resolve(__dirname, relativeToBabelConf)
  );
  return `./${resolvedPath.replace('\\', '/')}`;
}

const defaultAlias = {
  '@dx/file': resolveAliasPath('./packages/file/lib'),
};

const productionPlugins = [
  [
    require('babel-plugin-react-remove-properties').default,
    { properties: ['data-mui-test'] },
  ],
];

module.exports = function getBabelConfig(_, opts) {
  // const useESModules = api.env([
  //   'legacy',
  //   'modern',
  //   'stable',
  //   'rollup',
  //   'system',
  // ]);
  const env = process.env.BABEL_ENV || process.env.NODE_ENV;
  const isEnvDevelopment = env === 'development';
  const isEnvProduction = env === 'production';
  const isEnvTest = env === 'test';

  if (!opts) {
    opts = {};
  }
  const useESModules = validateBoolOption(
    'useESModules',
    opts.useESModules,
    isEnvDevelopment || isEnvProduction
  );
  // const isFlowEnabled = validateBoolOption('flow', opts.flow, true);
  const isTypeScriptEnabled = validateBoolOption(
    'typescript',
    opts.typescript,
    true
  );
  const areHelpersEnabled = validateBoolOption('helpers', opts.helpers, true);
  const useAbsoluteRuntime = validateBoolOption(
    'absoluteRuntime',
    opts.absoluteRuntime,
    true
  );

  let absoluteRuntimePath = undefined;
  if (useAbsoluteRuntime) {
    absoluteRuntimePath = path.dirname(
      require.resolve('@babel/runtime/package.json')
    );
  }
  const presets = [
    isEnvTest && [
      // ES features necessary for user's Node version
      require('@babel/preset-env').default,
      {
        targets: {
          node: 'current',
        },
      },
    ],
    (isEnvProduction || isEnvDevelopment) && [
      // Latest stable ECMAScript features
      require('@babel/preset-env').default,
      {
        // Allow importing core-js in entrypoint and use browserlist to select polyfills
        useBuiltIns: 'entry',
        // Set the corejs version we are using to avoid warnings in console
        corejs: 3,
        // Exclude transforms that make all code slower
        exclude: ['transform-typeof-symbol'],
        modules: false,
        // ignoreBrowserslistConfig: true,
        // targets: '>1%, not dead, not op_mini all',
        // browserslistEnv: 'last 1 chrome version',
      },
    ],
    [
      require('@babel/preset-react').default,
      {
        // Adds component stack to warning messages
        // Adds __self attribute to JSX which React will use for some warnings
        development: isEnvDevelopment || isEnvTest,
        // Will use the native built-in instead of trying to polyfill
        // behavior for any plugins that require one.
        runtime: 'automatic',
        // ...(opts.runtime !== 'automatic' ? { useBuiltIns: true } : {}),
        // runtime: opts.runtime || 'classic',
      },
    ],
    isTypeScriptEnabled && [require('@babel/preset-typescript').default],
  ].filter(Boolean);
  const shouldUseReactRefresh = process.env.FAST_REFRESH !== 'false';
  const plugins = [
    [
      require('babel-plugin-macros'),
      {
        muiError: {
          errorCodesPath,
          missingError,
        },
      },
    ],
    require('babel-plugin-optimize-clsx'),
    require('babel-plugin-no-side-effect-class-properties'),
    [
      require('@liradb2000/babel-plugin-transform-globals'),
      { replace: 'browser', globalKey: opts.globalKey ?? 'window' },
    ],
    // Need the following 3 proposals for all targets in .browserslistrc.
    // With our usage the transpiled loose mode is equivalent to spec mode.
    [
      require('@babel/plugin-proposal-class-properties').default,
      { loose: true },
    ],
    [
      require('@babel/plugin-proposal-private-methods').default,
      { loose: true },
    ],
    [
      require('@babel/plugin-transform-private-property-in-object').default,
      { loose: true },
    ],
    [
      require('@babel/plugin-transform-object-rest-spread').default,
      { loose: true },
    ],
    [
      require('@babel/plugin-proposal-nullish-coalescing-operator').default,
      { loose: true },
    ],
    [
      require('@babel/plugin-transform-runtime'),
      {
        corejs: false,
        helpers: areHelpersEnabled,
        // By default, babel assumes babel/runtime version 7.0.0-beta.0,
        // explicitly resolving to match the provided helper functions.
        // https://github.com/babel/babel/issues/10261
        version: require('@babel/runtime/package.json').version,
        regenerator: true,
        // https://babeljs.io/docs/en/babel-plugin-transform-runtime#useesmodules
        // We should turn this on once the lowest version of Node LTS
        // supports ES Modules.
        useESModules,
        // Undocumented option that lets us encapsulate our runtime, ensuring
        // the correct version is used
        // https://github.com/babel/babel/blob/090c364a90fe73d36a30707fc612ce037bdbbb24/packages/babel-plugin-transform-runtime/src/index.js#L35-L42
        absoluteRuntime: absoluteRuntimePath,
      },
    ],
    [
      require('babel-plugin-transform-react-remove-prop-types').default,
      {
        mode: 'unsafe-wrap',
      },
    ],
    isEnvDevelopment &&
      shouldUseReactRefresh &&
      require.resolve('react-refresh/babel'),
    require('babel-plugin-annotate-pure-calls').default,
  ].filter(Boolean);

  if (process.env.NODE_ENV === 'production') {
    plugins.push(...productionPlugins);
  }
  if (process.env.NODE_ENV === 'test') {
    plugins.push([
      require('babel-plugin-module-resolver').default,
      {
        alias: defaultAlias,
        root: ['./'],
      },
    ]);
  }

  return {
    assumptions: {
      noDocumentAll: true,
    },
    presets,
    plugins,
    overrides: [
      {
        exclude: /\.test\.(js|ts|tsx)$/,
        plugins: [
          require('@babel/plugin-transform-react-constant-elements').default,
        ],
      },
    ],
    env: {
      coverage: {
        plugins: [
          require('babel-plugin-istanbul').default,
          [
            require('babel-plugin-module-resolver').default,
            {
              root: ['./'],
              alias: defaultAlias,
            },
          ],
        ],
      },
      development: {
        plugins: [
          [
            require('babel-plugin-module-resolver').default,
            {
              alias: {
                ...defaultAlias,
                modules: './modules',
                'typescript-to-proptypes':
                  './packages/typescript-to-proptypes/src',
              },
              root: ['./'],
            },
          ],
        ],
      },
      legacy: {
        plugins: [
          // IE11 support
          require('@babel/plugin-transform-object-assign').default,
        ],
      },
      test: {
        sourceMaps: 'both',
        plugins: [
          [
            require('babel-plugin-module-resolver').default,
            {
              root: ['./'],
              alias: defaultAlias,
            },
          ],
        ],
      },
      benchmark: {
        plugins: [
          ...productionPlugins,
          [
            require('babel-plugin-module-resolver').default,
            {
              alias: defaultAlias,
            },
          ],
        ],
      },
    },
  };
};
