import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";

export default {
  input: "./src/index.js",
  output: [
    {
      file: "./build/bundle.js",
      format: "iife",
      sourcemap: true,
      globals: {
        global: "global",
        LiteGraph: "LiteGraph",
        THREE: "THREE",
      },
    },
  ],
  plugins: [resolve({ browser: true }), commonjs(), json()],
  external: ["global", "LiteGraph", "THREE"],
};
