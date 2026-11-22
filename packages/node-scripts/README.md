# @design-express/node-scripts

Build tools for DESIGN EXPRESS Fabrica xnodes (node packages). Entry files are `src/nodes/**/+<name>.js(x)`
(also `.ts`/`.tsx`); every exported class is a node, registered as `<static path>/<static title>`.

Requires Node.js ≥ 22.15.

| Command | What it does |
| --- | --- |
| `node-scripts build` | Production build into `build/` (runtime + manifest for the Fabrica installer). |
| `node-scripts pack` | `build/` + README → `<name>-<version>.xnode`. |
| `node-scripts watch` | Development build with hot module replacement into `build-dev/` — **no server, no port** (see below). |
| `node-scripts start` | Development server for the DESIGN EXPRESS web editor (connect `@<ns>/<name>:<port>`). |
| `node-scripts publish` | Publish the pack to DESIGN EXPRESS. |
| `node-scripts docs` | `docs/index.md` from the JSDoc comments. |
| `node-scripts setUser` | Store the DESIGN EXPRESS credentials (OS keychain). |

## `watch` — hot reload without a dev server

```
node-scripts watch [--out build-dev] [--public-path <url>]
```

webpack rebuilds incrementally into `--out` and writes `<out>/hmr.json` after every build:
`{ name, hash, ok, time, builtAt, errors[], warnings }`. The host that runs the development bundle serves the output
under `--public-path` itself (the Fabrica VS Code extension uses the webview resource URL of `build-dev/`) and, after a
rebuild, applies it with

```js
const result = await globalThis.__NODE_SCRIPTS_HMR__["<package name>"].check("<hash from hmr.json>");
// result.status: "applied" | "up-to-date" | "busy" | "reload" | "unsupported"
```

`"reload"` means the change could not be applied in place (no accepting module); reload the bundle. Hot-update files of
the last 20 builds are kept.

## Environment

| Variable | Effect |
| --- | --- |
| `NODE_SCRIPTS_CACHE=false` | Disable webpack's persistent cache. |
| `NODE_SCRIPTS_CACHE_DIR` | Cache location (default `node_modules/.cache/node-scripts`; one sub-folder per Node ABI). |
| `GENERATE_SOURCEMAP=true` | Source maps for production builds. |
| `FAST_REFRESH=false` | Disable React Fast Refresh in development builds. |
| `HTTPS=true`, `SSL_CRT_FILE`, `SSL_KEY_FILE` | HTTPS for `start`. |
| `HOST` | Address `start` binds to (default `localhost`; `0.0.0.0` exposes it on the network). |
| `DEV_SERVER_ALLOWED_ORIGINS` | Extra comma-separated origins for `start`, e.g. `https://localhost:3000`. `https://x.nexivil.com` is always allowed. An allowed origin gets CORS (incl. the Private Network Access preflight), the HMR WebSocket, and no-cors loads such as `<img>`; cross-site no-cors loads from other pages are refused. |
| `DANGEROUSLY_DISABLE_HOST_CHECK=true` | Accept any `Host` header in `start` (default: localhost names only). |

## Credentials

`setUser` stores the e-mail and access token in the OS keychain through `@napi-rs/keyring` (prebuilt, no install
script). Credentials saved by node-scripts < 2.2 (keytar) are migrated automatically on the first `publish`.

## Linting

node-scripts no longer bundles ESLint. New projects from `@design-express/node-template` get an ESLint 9 flat config
(`eslint.config.mjs`, `npm run lint`). Existing projects can delete `"eslintConfig"` from `package.json` and copy that
file plus its devDependencies (`eslint@9`, `@eslint/js@9`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals`).

## Compatibility notes (2.2)

- `runtime.js` is patched for the Fabrica installer (`x_fi`, `fetcher("./"+id)`, chunk field names). The patch is
  verified: if a webpack/terser update changes the runtime so a patch no longer applies, the build fails with the
  offending excerpt instead of producing a runtime the installer cannot load.
- Imports of names a module does not export are warnings (webpack ≥ 5.10x also reports unused ones, e.g. type names in
  JS copied from TypeScript); missing re-exports stay errors.
- CSS modules keep the default export (`import styles from './x.module.css'`).
