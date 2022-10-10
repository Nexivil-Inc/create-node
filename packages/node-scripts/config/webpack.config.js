/**
 * Based heavily on https://github.com/facebook/create-react-app/blob/
 *  9802941ff049a28da2682801bc182a29761b71f4/packages/react-scripts/config/webpack.config.js
 * Original Copyright (c) 2015-present, Facebook, Inc. @facebook (MIT license)
 */

const paths = require('../config/paths');
const modules = require('./modules');

const { ProvidePlugin } = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const babelRuntimeEntry = require.resolve('babel-preset-react-app');
const babelRuntimeEntryHelpers = require.resolve(
  '@babel/runtime/helpers/esm/assertThisInitialized',
  { paths: [babelRuntimeEntry] }
);
const babelRuntimeRegenerator = require.resolve('@babel/runtime/regenerator', {
  paths: [babelRuntimeEntry],
});

const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const reactRefreshRuntimeEntry = require.resolve('react-refresh/runtime');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const reactRefreshWebpackPluginRuntimeEntry = require.resolve(
  '@pmmmwh/react-refresh-webpack-plugin'
);
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent');
const packinfo = require(paths.appPackageJson);

const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const sassRegex = /\.(scss|sass)$/;
const sassModuleRegex = /\.module\.(scss|sass)$/;

const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';

module.exports = webpackEnv => {
  //   const paths = { appSrc: dirname, publicUrlOrPath: '/' };
  const isEnvDevelopment = webpackEnv === 'development';
  const isEnvProduction = webpackEnv === 'production';
  const useTailwind = false;
  // common function to get style loaders
  const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
      isEnvDevelopment && require.resolve('style-loader'),
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        // css is located in `static/css`, use '../../' to locate index.html folder
        // in production `paths.publicUrlOrPath` can be a relative path
        options: paths.publicUrlOrPath.startsWith('.')
          ? { publicPath: '../../' }
          : {},
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
      {
        // Options for PostCSS as we reference these options twice
        // Adds vendor prefixing based on your specified browser support in
        // package.json
        loader: require.resolve('postcss-loader'),
        options: {
          postcssOptions: {
            // Necessary for external CSS imports to work
            // https://github.com/facebook/create-react-app/issues/2677
            ident: 'postcss',
            config: false,
            plugins: !useTailwind
              ? [
                  'postcss-flexbugs-fixes',
                  [
                    'postcss-preset-env',
                    {
                      autoprefixer: {
                        flexbox: 'no-2009',
                      },
                      stage: 3,
                    },
                  ],
                  // Adds PostCSS Normalize as the reset css with default options,
                  // so that it honors browserslist config in package.json
                  // which in turn let's users customize the target behavior as per their needs.
                  'postcss-normalize',
                ]
              : [
                  'tailwindcss',
                  'postcss-flexbugs-fixes',
                  [
                    'postcss-preset-env',
                    {
                      autoprefixer: {
                        flexbox: 'no-2009',
                      },
                      stage: 3,
                    },
                  ],
                ],
          },
          sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
        },
      },
    ].filter(Boolean);
    if (preProcessor) {
      loaders.push(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
            root: paths.appSrc,
          },
        },
        {
          loader: require.resolve(preProcessor),
          options: {
            sourceMap: true,
          },
        }
      );
    }
    return loaders;
  };

  const shouldUseReactRefresh = process.env.FAST_REFRESH !== 'false';
  return {
    entry: [
      isEnvDevelopment &&
        shouldUseReactRefresh &&
        require.resolve(
          '@pmmmwh/react-refresh-webpack-plugin/client/ReactRefreshEntry.js'
        ),
      isEnvDevelopment &&
        shouldUseReactRefresh &&
        require.resolve('react-refresh/runtime'),
      paths.appSrc,
    ].filter(Boolean),
    experiments: {
      // asyncWebAssembly: true,
      syncWebAssembly: true,
    },
    module: {
      strictExportPresence: true,
      rules: [
        { test: /\.[cm]?(js|tsx?)$/, parser: { requireEnsure: false } },
        {
          oneOf: [
            {
              test: /\.(ts|tsx)$/,
              use: [
                {
                  loader: require.resolve('ts-loader'),
                },
              ],
            },
            {
              test: /\.(js|mjs|jsx|ts|tsx)$/,
              exclude: [/node_modules/, /@babel[\\|/]runtime/], // Fix a Windows issue.
              use: {
                loader: require.resolve('babel-loader'),
                options: {
                  //   babelrc: false,
                  //   configFile: false,
                  presets: [require.resolve('./babel.config')],
                },
              },
            },
            {
              test: /\.svg?$/,
              oneOf: [
                {
                  use: [
                    {
                      loader: require.resolve('@svgr/webpack'),
                      options: {
                        prettier: false,
                        svgo: true,
                        svgoConfig: {
                          plugins: [
                            {
                              removeViewBox: false,
                            },
                          ],
                        },
                        titleProp: true,
                      },
                    },
                    require.resolve('svg-inline-loader'),
                  ],
                  issuer: {
                    and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
                  },
                },
                {
                  type: 'asset',
                  parser: {
                    dataUrlCondition: {
                      maxSize: 10 * 1024, // 4kb
                    },
                  },
                  generator: {
                    filename: 'static/media/[name].[hash:8].[ext]',
                  },
                },
              ],
            },
            // {
            //   test: /\.svg$/,
            //   use: ["@svgr/webpack", "svg-inline-loader"],
            // },
            // {
            //   test: /\.(s)?css$/i,
            //   use: ["style-loader", "css-loader", "sass-loader"],
            // },
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              type: 'asset',
              parser: {
                dataUrlCondition: {
                  maxSize: 10 * 1024, // 4kb
                },
              },
              generator: {
                filename: 'static/media/[name].[hash:8].[ext]',
              },
            },
            // "postcss" loader applies autoprefixer to our CSS.
            // "css" loader resolves paths in CSS and adds assets as dependencies.
            // "style" loader turns CSS into JS modules that inject <style> tags.
            // In production, we use MiniCSSExtractPlugin to extract that CSS
            // to a file, but in development "style" loader enables hot editing
            // of CSS.
            // By default we support CSS Modules with the extension .module.css
            {
              test: cssRegex,
              exclude: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction
                  ? shouldUseSourceMap
                  : isEnvDevelopment,
              }),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
            // using the extension .module.css[0,1,2]
            {
              test: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction
                  ? shouldUseSourceMap
                  : isEnvDevelopment,
                modules: {
                  getLocalIdent: getCSSModuleLocalIdent,
                },
              }),
            },
            // Opt-in support for SASS (using .scss or .sass extensions).
            // By default we support SASS Modules with the
            // extensions .module.scss or .module.sass
            {
              test: sassRegex,
              exclude: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                },
                'sass-loader'
              ),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules, but using SASS
            // using the extension .module.scss or .module.sass
            {
              test: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                  modules: {
                    getLocalIdent: getCSSModuleLocalIdent,
                  },
                },
                'sass-loader'
              ),
            },
            // {
            //   test: /\.wasm$/,
            //   type: 'asset/resource',
            // },
            {
              test: /\.json$/,
              type: 'asset/resource',
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              type: 'asset/resource',
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [
                /\.(js|mjs|jsx|ts|tsx)$/,
                /\.html$/,
                /\.json$/,
                /\.wasm$/,
                // /\.svg$/,
              ],
              dependency: { not: ['url'] },
              generator: {
                filename: 'static/media/[name].[hash:8].[ext]',
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new ProvidePlugin({
        process: require.resolve('process/browser'),
        Buffer: [require.resolve('buffer'), require.resolve('Buffer')],
      }),
      // Experimental hot reloading for React .
      // https://github.com/facebook/react/tree/main/packages/react-refresh
      isEnvDevelopment &&
        shouldUseReactRefresh &&
        new ReactRefreshWebpackPlugin({
          overlay: false,
          library: packinfo.name.replace('@', ''),
        }),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      isEnvDevelopment && new CaseSensitivePathsPlugin(),
    ].filter(Boolean),
    resolve: {
      // This allows you to set a fallback for where webpack should look for modules.
      // We placed these paths second because we want `node_modules` to "win"
      // if there are any conflicts. This matches Node resolution mechanism.
      // https://github.com/facebook/create-react-app/issues/253
      modules: ['node_modules', paths.appNodeModules].concat(
        modules.additionalModulePaths || []
      ),
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      // alias: {
      //     "#extension:": path.resolve(dirname, "./node_modules/"),
      //     URLs: path.resolve(__dirname, "./Urls/index.js"),
      //     TYPEs: path.resolve(__dirname, "./type.js"),
      // },
      fallback: {
        buffer: require.resolve('buffer/'),
        vm: require.resolve('vm-browserify'),
        url: require.resolve('url/'),
        constants: require.resolve('constants-browserify'),
        util: require.resolve('util/'),
      },
      plugins: [
        // Prevents users from importing files from outside of src/ (or node_modules/).
        // This often causes confusion because we only process files within src/ with babel.
        // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        new ModuleScopePlugin(paths.appSrc, [
          paths.appPackageJson,
          reactRefreshRuntimeEntry,
          reactRefreshWebpackPluginRuntimeEntry,
          babelRuntimeEntry,
          babelRuntimeEntryHelpers,
          babelRuntimeRegenerator,
        ]),
      ],
    },
    output: {
      // path: path.resolve(dirname, "dist"),
      path: paths.appBuild,
      filename: '[name].js',
      //   publicPath: `/installedext/${'Test'}/dist/`,
      // library: "react-component-library",
      // libraryTarget: 'global',
      // chunkLoading: 'import',
      chunkLoading: isEnvDevelopment ? 'jsonp' : 'import',
      importFunctionName: 'fetcher',
      // chunkFormat: 'module',
      chunkFormat: 'array-push',
      chunkFilename: '[name].[hash:8].js',
      // // Bug: https://github.com/callstack/repack/issues/201#issuecomment-1186682200
      // clean: true,
      libraryTarget: isEnvDevelopment ? 'window' : 'amd',
      library: {
        umdNamedDefine: true,
        type: isEnvDevelopment ? 'window' : 'amd',
      },
      uniqueName: packinfo.name.replace('@', ''),
    },
    externals: [
      {
        react: 'react',
        'react-dom': 'react-dom',
        'react/jsx-runtime': 'react/jsx-runtime',
        'react/jsx-dev-runtime': 'react/jsx-dev-runtime',
        path: 'path',
        crypto: 'crypto',
        'react-i18next': 'react-i18next',
        '@mui/material': '@mui/material',
        '@mui/material/utils': '@mui/material/utils',
        '@mui/lab': '@mui/lab',
        three: 'three',
        immutable: 'immutable',
        lodash: 'lodash',
        'litegraph.js': 'LiteGraph',
        'react-virtualized': 'react-virtualized',
        'zstd-codec': 'zstd-codec',
        zustand: 'zustand',
        // "@design-express/components/widget": "@design-express/components/widget",
        // "@design-express/components/virtualized": "@design-express/components/virtualized",
        // "@design-express/components/markdown": "@design-express/components/markdown",
        // "@design-express/utils/auth": "@design-express/utils/auth",
        // "@design-express/utils/axios": "@design-express/utils/axios",
        // "@design-express/utils/converter": "@design-express/utils/converter",
        // "@design-express/utils/labs": "@design-express/utils/labs",
        // "@design-express/utils/cookies": "@design-express/utils/cookies",
        // "@design-express/utils/settings": "@design-express/utils/settings",
        'system/ui': 'system/ui',
      },
      /@design-express\//,
      /@mui\/styles/,
      /#extension:/i,
    ],
    optimization: {
      runtimeChunk: isEnvDevelopment ? 'single' : false,
    },
    mode: isEnvProduction ? 'production' : 'development',
    devtool: 'source-map',
  };
};
