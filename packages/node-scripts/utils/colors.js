'use strict';
// Terminal colours with Node's built-in util.styleText (replaces chalk, which is ESM-only since v5).
// Same call style as chalk for what node-scripts uses: colors.red('x'), colors.red.bold('x').
const { styleText } = require('util');

const enabled =
  process.env.FORCE_COLOR !== '0' &&
  process.env.NO_COLOR === undefined &&
  (process.stdout.isTTY || process.env.FORCE_COLOR !== undefined);

const STYLES = [
  'bold',
  'dim',
  'italic',
  'underline',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'gray',
  'redBright',
  'greenBright',
  'yellowBright',
  'blueBright',
  'cyanBright',
  'bgRed',
  'bgGreen',
  'bgYellow',
  'bgBlue',
];

/** A styler for the given style list; every style is also a property (colors.red.bold). */
function styler(styles) {
  const fn = text => (enabled && styles.length ? styleText(styles, String(text)) : String(text));
  for (const s of STYLES) {
    Object.defineProperty(fn, s, { get: () => styler([...styles, s]) });
  }
  return fn;
}

module.exports = styler([]);
