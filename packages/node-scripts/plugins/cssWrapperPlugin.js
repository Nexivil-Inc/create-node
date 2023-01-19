/**
 * The MIT License (MIT)

Copyright 2016 AUTHOR_NAME <AUTHOR_EMAIL>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/**
 * https://github.com/domwashburn/postcss-parent-selector
 */

const cssWrapperPlugin = function (opts) {
  opts = opts || {};

  // Work with options here
  return {
    postcssPlugin: 'cssWrapperPlugin',
    Rule(rule) {
      if (
        rule.parent &&
        rule.parent.type === 'atrule' &&
        rule.parent.name.indexOf('keyframes') !== -1
      ) {
        return;
      }

      rule.selectors = rule.selectors.map(selectors => {
        return selectors.split(/,[\s]* /g).map(selector => {
          // don't add the parent class to a rule that is
          // exactly equal to the one defined by the user
          if (selector === opts.selector) {
            return selector;
          }
          var newsSelector = `${opts.selector} ${selector}`;
          return newsSelector;
        });
      });
    },
  };
};
cssWrapperPlugin.postcss = true;
module.exports = cssWrapperPlugin;
