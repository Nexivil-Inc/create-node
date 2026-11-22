/* global __NODE_SCRIPTS_PACKAGE__, __webpack_hash__ */
// Server-less HMR client of `node-scripts watch` (no dev server, no socket, no port).
// The host that evaluates the development bundle (e.g. the Fabrica VS Code extension) reads build-dev/hmr.json after
// each rebuild and calls:
//     await globalThis.__NODE_SCRIPTS_HMR__["<package name>"].check("<build hash>")
// which downloads the hot update through the bundle's normal chunk loading (publicPath) and applies it.
// Result: { status: "applied" | "up-to-date" | "busy" | "reload" | "unsupported", ... } — "reload" means the change
// could not be hot-applied (e.g. a module without an accepting parent) and the host should reload the bundle.

// On the page's real window: a sandboxing installer may pass a proxy as globalThis (see scripts/watch.js).
const root = (typeof document !== 'undefined' && document.defaultView) || globalThis;
const registry = (root.__NODE_SCRIPTS_HMR__ = root.__NODE_SCRIPTS_HMR__ || {});

registry[__NODE_SCRIPTS_PACKAGE__] = {
  /** Hash of the code currently running. */
  get hash() {
    return __webpack_hash__;
  },
  async check(targetHash) {
    if (!module.hot) return { status: 'unsupported' };
    if (targetHash && targetHash === __webpack_hash__) return { status: 'up-to-date' };
    if (module.hot.status() !== 'idle') return { status: 'busy', hmr: module.hot.status() };
    try {
      const updated = await module.hot.check(true);
      // null: no update manifest for the running hash (it was cleaned up, or the bundle is too old) → reload
      if (!updated) return { status: 'reload', reason: 'no hot update for the running build' };
      return { status: 'applied', modules: updated.length, hash: __webpack_hash__ };
    } catch (e) {
      return { status: 'reload', reason: String((e && e.message) || e) };
    }
  },
};
