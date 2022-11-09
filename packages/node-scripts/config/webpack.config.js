/**
 * Based heavily on https://github.com/facebook/create-react-app/blob/
 *  9802941ff049a28da2682801bc182a29761b71f4/packages/react-scripts/config/webpack.config.js
 * Original Copyright (c) 2015-present, Facebook, Inc. @facebook (MIT license)
 */

const paths = require('../config/paths');
const modules = require('./modules');

const { ProvidePlugin, IgnorePlugin } = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

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
const getCacheIdentifier = require('react-dev-utils/getCacheIdentifier');
const packinfo = require(paths.appPackageJson);

const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const sassRegex = /\.(scss|sass)$/;
const sassModuleRegex = /\.module\.(scss|sass)$/;

const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';
const imageInlineSizeLimit = parseInt(
  process.env.IMAGE_INLINE_SIZE_LIMIT || '10000'
);

module.exports = webpackEnv => {
  //   const paths = { appSrc: dirname, publicUrlOrPath: '/' };
  const isEnvDevelopment = webpackEnv === 'development';
  const isEnvProduction = webpackEnv === 'production';
  const isEnvProductionProfile =
    isEnvProduction && process.argv.includes('--profile');
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
        shouldUseSourceMap && {
          enforce: 'pre',
          exclude: /@babel(?:\/|\\{1,2})runtime/,
          test: /\.(js|mjs|jsx|ts|tsx|css)$/,
          loader: require.resolve('source-map-loader'),
        },
        {
          oneOf: [
            {
              test: [/\.avif$/],
              type: 'asset',
              mimetype: 'image/avif',
              parser: {
                dataUrlCondition: {
                  maxSize: imageInlineSizeLimit,
                },
              },
            },
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              type: 'asset',
              parser: {
                dataUrlCondition: {
                  maxSize: imageInlineSizeLimit,
                },
              },
              // generator: {
              //   filename: 'static/media/[name].[hash].[ext]',
              // },
            },
            {
              test: /\.svg$/,
              use: [
                {
                  loader: require.resolve('@svgr/webpack'),
                  options: {
                    prettier: false,
                    svgo: false,
                    svgoConfig: {
                      plugins: [{ removeViewBox: false }],
                    },
                    titleProp: true,
                    ref: true,
                  },
                },
                {
                  loader: require.resolve('file-loader'),
                  options: {
                    name: 'static/media/[name].[hash].[ext]',
                  },
                },
              ],
              issuer: {
                and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
              },
            },
            {
              test: /\.(js|mjs)$/,
              exclude: /@babel(?:\/|\\{1,2})runtime/,
              loader: require.resolve('babel-loader'),
              options: {
                babelrc: false,
                configFile: false,
                compact: false,
                presets: [require.resolve('./babel.config')],
                cacheDirectory: true,
                cacheCompression: false,
                cacheIdentifier: getCacheIdentifier(
                  isEnvProduction
                    ? 'production'
                    : isEnvDevelopment && 'development',
                  [
                    'babel-plugin-named-asset-import',
                    'babel-preset-react-app',
                    'react-dev-utils',
                    'react-scripts',
                  ]
                ),
                sourceMaps: shouldUseSourceMap,
                inputSourceMap: shouldUseSourceMap,
              },
            },
            {
              test: cssRegex,
              exclude: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction
                  ? shouldUseSourceMap
                  : isEnvDevelopment,
                modules: {
                  mode: 'icss',
                },
              }),
              sideEffects: true,
            },
            {
              test: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction
                  ? shouldUseSourceMap
                  : isEnvDevelopment,
                modules: {
                  mode: 'local',
                  getLocalIdent: getCSSModuleLocalIdent,
                },
              }),
            },
            {
              test: sassRegex,
              exclude: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                  modules: {
                    mode: 'icss',
                  },
                },
                'sass-loader'
              ),
              sideEffects: true,
            },
            {
              test: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                  modules: {
                    mode: 'local',
                    getLocalIdent: getCSSModuleLocalIdent,
                  },
                },
                'sass-loader'
              ),
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [
                /^$/,
                /\.(js|mjs|jsx|ts|tsx)$/,
                /\.html$/,
                /\.json$/,
                /\.wasm$/,
              ],
              type: 'asset/resource',
              dependency: { not: ['url'] },
              // generator: {
              //   filename: 'static/media/[name].[hash].[ext]',
              // },
            },
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.

            /** Legacy SVG load module */
            // {
            //   test: /\.svg?$/,
            //   oneOf: [
            //     {
            //       use: [
            //         {
            //           loader: require.resolve('@svgr/webpack'),
            //           options: {
            //             prettier: false,
            //             svgo: true,
            //             svgoConfig: {
            //               plugins: [
            //                 {
            //                   removeViewBox: false,
            //                 },
            //               ],
            //             },
            //             titleProp: true,
            //           },
            //         },
            //         require.resolve('svg-inline-loader'),
            //       ],
            //       issuer: {
            //         and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
            //       },
            //     },
            //     {
            //       type: 'asset',
            //       parser: {
            //         dataUrlCondition: {
            //           maxSize: 10 * 1024, // 4kb
            //         },
            //       },
            //       generator: {
            //         filename: 'static/media/[name].[hash:8].[ext]',
            //       },
            //     },
            //   ],
            // },
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
      isEnvProduction && new MiniCssExtractPlugin(), // Generate an asset manifest file with the following content:
      // - "files" key: Mapping of all asset filenames to their corresponding
      //   output file so that tools can pick it up without having to parse
      //   `index.html`
      // - "entrypoints" key: Array of files which are included in `index.html`,
      //   can be used to reconstruct the HTML if necessary
      new WebpackManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: paths.publicUrlOrPath,
        generate: (seed, files, entrypoints) => {
          const manifestFiles = files.reduce((manifest, file) => {
            manifest[file.name] = file.path;
            return manifest;
          }, seed);
          const entrypointFiles = entrypoints.main.filter(
            fileName => !fileName.endsWith('.map')
          );

          return {
            version: '1.0.0',
            files: manifestFiles,
            entrypoints: entrypointFiles,
          };
        },
      }),
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
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
        fs: false,
        stream: require.resolve('stream-browserify'),
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
      chunkFilename: isEnvProduction
        ? 'static/js/[name].[contenthash:8].chunk.js'
        : isEnvDevelopment && 'static/js/[name].chunk.js',
      // // Bug: https://github.com/callstack/repack/issues/201#issuecomment-1186682200
      // clean: true,
      libraryTarget: isEnvDevelopment ? 'window' : 'amd',
      library: {
        umdNamedDefine: true,
        type: isEnvDevelopment ? 'window' : 'amd',
      },
      uniqueName: packinfo.name.replace('@', ''),
      assetModuleFilename: 'static/media/[name].[hash][ext]',
    },
    externals: [
      {
        react: 'react',
        React: 'react',
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
      splitChunks: {
        chunks: 'async',
        usedExports: true,
        // chunks: 'async',
        // // minSize: 20000,
        // // minRemainingSize: 0,
        // // minChunks: 1,
        // // maxAsyncRequests: 30,
        // // maxInitialRequests: 30,
        // // enforceSizeThreshold: 50000,
        // cacheGroups: {
        //   defaultVendors: {
        //     enforce: true,
        //     test: /[\\/]node_modules[\\/]/,
        //     priority: -10,
        //     reuseExistingChunk: true,
        //   },
        //   default: {
        //     minChunks: 2,
        //     priority: -20,
        //     reuseExistingChunk: true,
        //   },
        // },
      },
      minimize: isEnvProduction,
      minimizer: [
        // This is only used in production mode
        new TerserPlugin({
          // minify: TerserPlugin.swcMinify,
          // minify: TerserPlugin.esbuildMinify,
          terserOptions: {
            module: true,
            toplevel: true,
            parse: {
              // We want terser to parse ecma 8 code. However, we don't want it
              // to apply any minification steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending further investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2,
              pure_getters: true,
              // defaults: false,
              toplevel: true,
              negate_iife: false,
            },
            mangle: {
              safari10: true,
            },
            // Added for profiling in devtools
            keep_classnames: isEnvProductionProfile,
            keep_fnames: isEnvProductionProfile,
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
        }),
        // This is only used in production mode
        new CssMinimizerPlugin(),
      ],
      usedExports: true,
      innerGraph: true,
      sideEffects: false,
    },
    mode: isEnvProduction ? 'production' : 'development',
    devtool: 'source-map',
  };
};
