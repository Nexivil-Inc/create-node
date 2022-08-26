// const path = require('path');
const paths = require('../config/paths');
const { ProvidePlugin } = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const postcssNormalize = require("postcss-normalize");
// const CopyPlugin = require("copy-webpack-plugin");

// const getCSSModuleLocalIdent = require("./webpack/utils/getCSSModuleIdent");
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent');
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

  // const shouldUseReactRefresh = process.env.FAST_REFRESH !== "false";
  // const shouldUseReactRefresh = false;
  return {
    entry: [], //path.resolve(__dirname, rootPath),
    experiments: {
      asyncWebAssembly: true,
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
            {
              test: /\.wasm$/,
              type: 'asset/resource',
            },
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
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      }),
    ],
    resolve: {
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
    },
    output: {
      // path: path.resolve(dirname, "dist"),
      path: paths.appBuild,
      filename: '[name].js',
    //   publicPath: `/installedext/${'Test'}/dist/`,
      // library: "react-component-library",
      libraryTarget: 'global',
      chunkLoading: 'import',
      importFunctionName: 'fetcher',
      chunkFormat: 'array-push',
      chunkFilename: '[name].[hash:8].js',
      clean: true,
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
        // "litegraph.js": "litegraph.js",
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
    // devServer: {
    //   contentBase: path.resolve(dirname, './public'),
    // },
    // optimization: {
    //   splitChunks: {
    //     chunks: "all",
    //   },
    // },
    mode: 'production',
    devtool: 'source-map',
  };
};
// const path = require("path");

// module.exports = {
//   entry: "./src/index.ts",
//   output: {
//     path: path.resolve("dist"),
//     filename: "[name].js",
//     library: "react-component-library",
//     libraryTarget: "system",
//   },
//   resolve: {
//     extensions: [".ts", ".tsx", ".js"],
//     alias: {
//       "@thedesignsystem/button": path.resolve(
//         __dirname,
//         "../components/button/src/index"
//       ),
//     },
//   },
//   module: {
//     rules: [],
//   },
//   externals: {
//     react: "react",
//     "react-dom": "react-dom",
//   },
// };
