'use strict';
// Build / dev-server helpers previously taken from react-dev-utils (create-react-app, (c) Facebook, MIT license).
// react-dev-utils is unmaintained and hard-depends on fork-ts-checker-webpack-plugin → eslint@8 (deprecated chain of
// rimraf@3 / glob@7 / inflight in every xnode repository). Only what node-scripts uses is kept, ported to plain Node.
const fs = require('fs');
const net = require('net');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const { spawn } = require('child_process');
const loaderUtils = require('loader-utils');
const colors = require('./colors');

// ---------------------------------------------------------------- paths / config

/** Public URL of the build: PUBLIC_URL, else package.json "homepage", else "/". */
function getPublicUrlOrPath(isEnvDevelopment, homepage, envPublicUrl) {
  const stubDomain = 'https://stub.invalid';
  if (envPublicUrl) {
    envPublicUrl = envPublicUrl.endsWith('/') ? envPublicUrl : envPublicUrl + '/';
    const validPublicUrl = new URL(envPublicUrl, stubDomain);
    return isEnvDevelopment ? (envPublicUrl.startsWith('.') ? '/' : validPublicUrl.pathname) : envPublicUrl;
  }
  if (homepage) {
    homepage = homepage.endsWith('/') ? homepage : homepage + '/';
    const pathname = new URL(homepage, stubDomain).pathname;
    if (isEnvDevelopment) return homepage.startsWith('.') ? '/' : pathname;
    return homepage.startsWith('.') ? homepage : pathname;
  }
  return '/';
}

/** babel-loader cache key: environment + versions of the packages that shape the output. */
function getCacheIdentifier(environment, packages) {
  let id = environment == null ? '' : String(environment);
  for (const name of packages) {
    id += `:${name}@`;
    try {
      id += require(`${name}/package.json`).version;
    } catch {
      /* not installed */
    }
  }
  return id;
}

/** CSS-module class names: <file or folder>_<local>__<hash>. */
function getCSSModuleLocalIdent(context, localIdentName, localName, options) {
  const fileNameOrFolder = /index\.module\.(css|scss|sass)$/.test(context.resourcePath) ? '[folder]' : '[name]';
  const hash = loaderUtils.getHashDigest(path.posix.relative(context.rootContext, context.resourcePath) + localName, 'md5', 'base64', 5);
  const className = loaderUtils.interpolateName(context, `${fileNameOrFolder}_${localName}__${hash}`, options);
  return className.replace('.module_', '_').replace(/\./g, '_');
}

/** Static-file watch filter: node_modules outside src are ignored. */
function ignoredFiles(appSrc) {
  const src = path.normalize(appSrc + '/').replace(/[\\]+/g, '/').replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  return new RegExp(`^(?!${src}).+/node_modules/`, 'g');
}

/**
 * Resolver plugin: imports from src/ must stay inside src/ (or node_modules / allowed files).
 * Files outside src/ are not processed by Babel, so importing them only causes confusing errors.
 */
class ModuleScopePlugin {
  constructor(appSrc, allowedFiles = []) {
    this.appSrcs = Array.isArray(appSrc) ? appSrc : [appSrc];
    this.allowedFiles = new Set(allowedFiles);
    this.allowedPaths = [...allowedFiles].map(path.dirname).filter(p => path.relative(p, process.cwd()) !== '');
  }
  apply(resolver) {
    const outside = (from, to) => {
      const rel = path.relative(from, to);
      return rel.startsWith('../') || rel.startsWith('..\\');
    };
    resolver.hooks.file.tapAsync('ModuleScopePlugin', (request, _ctx, callback) => {
      const issuer = request.context.issuer;
      if (!issuer) return callback(); // entry
      const root = request.descriptionFileRoot || '';
      if (root.includes('/node_modules/') || root.includes('\\node_modules\\') || !request.__innerRequest_request) return callback();
      if (this.appSrcs.every(src => outside(src, issuer))) return callback(); // the issuer itself is outside src
      const full = path.resolve(path.dirname(issuer), request.__innerRequest_request);
      if (this.allowedFiles.has(full) || this.allowedPaths.some(p => full.startsWith(p))) return callback();
      if (!this.appSrcs.every(src => outside(src, full))) return callback();
      const error = new Error(
        `You attempted to import ${colors.cyan(request.__innerRequest_request)} which falls outside of the project ${colors.cyan('src/')} directory. ` +
          `Relative imports outside of ${colors.cyan('src/')} are not supported.${os.EOL}` +
          `Move it inside ${colors.cyan('src/')}, or install it as a package (node_modules/).`,
      );
      Object.defineProperty(error, '__module_scope_plugin', { value: true });
      callback(error, request);
    });
  }
}

// ---------------------------------------------------------------- messages

const SYNTAX = 'Syntax error:';

function formatMessage(message) {
  let text = typeof message === 'string' ? message : (message && message.message) || '';
  if (message && typeof message === 'object' && message.moduleName && !text.startsWith(message.moduleName)) {
    text = `${message.moduleName}\n${text}`;
  }
  let lines = text.split('\n').filter(line => !/Module [A-z ]+\(from/.test(line));
  lines = lines.map(line => {
    const m = /Line (\d+):(?:(\d+):)?\s*Parsing error: (.+)$/.exec(line);
    return m ? `${SYNTAX} ${m[3]} (${m[1]}:${m[2]})` : line;
  });
  text = lines
    .join('\n')
    .replace(/SyntaxError\s+\((\d+):(\d+)\)\s*(.+?)\n/g, `${SYNTAX} $3 ($1:$2)\n`)
    .replace(/^.*export '(.+?)' was not found in '(.+?)'.*$/gm, `Attempted import error: '$1' is not exported from '$2'.`)
    .replace(/^.*export 'default' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm, `Attempted import error: '$2' does not contain a default export (imported as '$1').`)
    .replace(/^.*export '(.+?)' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm, `Attempted import error: '$1' is not exported from '$3' (imported as '$2').`);
  lines = text.split('\n');
  if (lines.length > 2 && lines[1].trim() === '') lines.splice(1, 1);
  lines[0] = lines[0].replace(/^(.*) \d+:\d+-\d+$/, '$1');
  if (lines[1] && lines[1].startsWith('Module not found: ')) {
    lines = [lines[0], lines[1].replace('Error: ', '').replace('Module not found: Cannot find file:', 'Cannot find file:')];
  }
  if (lines[1] && /Cannot find module.+sass/.test(lines[1])) {
    lines[1] = 'To import Sass files, install sass first: `npm install sass`.';
  }
  text = lines
    .join('\n')
    .replace(/^\s*at\s((?!webpack:).)*:\d+:\d+[\s)]*(\n|$)/gm, '') // stack frames
    .replace(/^\s*at\s<anonymous>(\n|$)/gm, '');
  return text
    .split('\n')
    .filter((line, i, arr) => i === 0 || line.trim() !== '' || line.trim() !== arr[i - 1].trim())
    .join('\n')
    .trim();
}

/** webpack stats JSON → readable { errors, warnings }. */
function formatWebpackMessages(json) {
  const result = { errors: (json.errors || []).map(formatMessage), warnings: (json.warnings || []).map(formatMessage) };
  if (result.errors.some(e => e.includes(SYNTAX))) result.errors = result.errors.filter(e => e.includes(SYNTAX));
  return result;
}

function printBuildError(err) {
  const message = err != null && err.message;
  const stack = err != null && err.stack;
  if (stack && typeof message === 'string' && message.includes('from Terser')) {
    const m = /(.+)\[(.+):(.+),(.+)\]\[.+\]/.exec(stack);
    if (m) console.log('Failed to minify the code from this file:\n\n', colors.yellow(`\t${m[2]}:${m[3]}${m[4] !== '0' ? ':' + m[4] : ''}`), '\n');
    else console.log('Failed to minify the bundle.', err);
  } else {
    console.log((message || err) + '\n');
  }
  console.log();
}

function clearConsole() {
  process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
}

// ---------------------------------------------------------------- file sizes

function formatSize(bytes) {
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${bytes} B`;
  if (abs < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
const canReadAsset = asset => /\.(js|css)$/.test(asset);
const removeFileNameHash = (root, fileName) =>
  fileName
    .replace(root, '')
    .replace(/\\/g, '/')
    .replace(/\/?(.*)(\.[0-9a-f]+)(\.chunk)?(\.js|\.css)/, (m, p1, p2, p3, p4) => p1 + p4);
const gzipSize = buf => zlib.gzipSync(buf, { level: 9 }).length;

function listFiles(dir, out = []) {
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
}

/** gzip sizes of the previous build, to print the difference. */
function measureFileSizesBeforeBuild(buildFolder) {
  const sizes = {};
  for (const file of listFiles(buildFolder).filter(canReadAsset)) {
    sizes[removeFileNameHash(buildFolder, file)] = gzipSize(fs.readFileSync(file));
  }
  return Promise.resolve({ root: buildFolder, sizes });
}

function printFileSizesAfterBuild(webpackStats, previous, buildFolder, maxBundleGzipSize, maxChunkGzipSize) {
  const { root, sizes } = previous;
  const assets = (webpackStats.stats || [webpackStats])
    .flatMap(stats => stats.toJson({ all: false, assets: true }).assets.filter(a => canReadAsset(a.name)))
    .map(asset => {
      const size = gzipSize(fs.readFileSync(path.join(root, asset.name)));
      const before = sizes[removeFileNameHash(root, asset.name)];
      const diff = before === undefined ? 0 : size - before;
      const diffLabel = diff ? ` (${diff > 0 ? '+' : ''}${formatSize(diff)})` : '';
      return { folder: path.join(path.basename(buildFolder), path.dirname(asset.name)), name: path.basename(asset.name), size, label: formatSize(size) + diffLabel };
    })
    .sort((a, b) => b.size - a.size);
  const width = Math.max(0, ...assets.map(a => a.label.length));
  for (const a of assets) {
    const limit = a.name.startsWith('main.') ? maxBundleGzipSize : maxChunkGzipSize;
    const large = limit && a.size > limit;
    const label = a.label.padEnd(width);
    console.log(`  ${large ? colors.yellow(label) : label}  ${colors.dim(a.folder + path.sep)}${colors.cyan(a.name)}`);
  }
}

// ---------------------------------------------------------------- dev server

const isFree = (host, port) =>
  new Promise(resolve => {
    const server = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => server.close(() => resolve(true)))
      .listen(port, host);
  });

/** The default port, or the next free one (a message says which). */
async function choosePort(host, defaultPort) {
  for (let port = defaultPort; port < defaultPort + 50; port++) {
    if (await isFree(host, port)) {
      if (port !== defaultPort) console.log(colors.yellow(`Port ${defaultPort} is in use — using ${port} instead.`));
      return port;
    }
  }
  console.log(colors.red(`No free port found from ${defaultPort} to ${defaultPort + 49}.`));
  return null;
}

/** URLs to print for the dev server. */
function prepareUrls(protocol, host, port, pathname = '/') {
  const unspecified = host === '0.0.0.0' || host === '::';
  const prettyHost = unspecified ? 'localhost' : host;
  const url = h => `${protocol}://${h}:${port}${pathname}`;
  let lanUrlForConfig;
  if (unspecified) {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .find(i => i && i.family === 'IPv4' && !i.internal && /^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(i.address));
    lanUrlForConfig = lan && lan.address;
  }
  return {
    lanUrlForConfig,
    lanUrlForTerminal: lanUrlForConfig ? url(lanUrlForConfig) : undefined,
    localUrlForTerminal: url(prettyHost),
    localUrlForBrowser: url(prettyHost),
  };
}

/** package.json "proxy" (a URL) → webpack-dev-server proxy config for API requests (not for page/asset requests). */
function prepareProxy(proxy, appPublicFolder, servedPathname = '/') {
  if (!proxy) return undefined;
  if (typeof proxy !== 'string' || !/^https?:\/\//.test(proxy)) {
    console.log(colors.red('When specified, "proxy" in package.json must be a string starting with http:// or https://.'));
    process.exit(1);
  }
  const servedPublicFile = pathname => {
    const rel = pathname.slice(servedPathname.length);
    return fs.existsSync(path.resolve(appPublicFolder, rel)) && fs.statSync(path.resolve(appPublicFolder, rel)).isFile();
  };
  return [
    {
      context: (pathname, req) =>
        req.method !== 'GET' ||
        (!(pathname.startsWith(servedPathname) && servedPublicFile(pathname)) && !!req.headers.accept && !req.headers.accept.includes('text/html')),
      target: proxy,
      changeOrigin: true,
      ws: true,
      secure: false,
      xfwd: true,
    },
  ];
}

/** Open a URL in the default browser. */
function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url.replace(/&/g, '^&')]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getPublicUrlOrPath,
  getCacheIdentifier,
  getCSSModuleLocalIdent,
  ignoredFiles,
  ModuleScopePlugin,
  formatWebpackMessages,
  printBuildError,
  clearConsole,
  measureFileSizesBeforeBuild,
  printFileSizesAfterBuild,
  choosePort,
  prepareUrls,
  prepareProxy,
  openBrowser,
};
