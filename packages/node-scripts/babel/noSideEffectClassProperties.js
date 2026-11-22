'use strict';
// Vendored from babel-plugin-no-side-effect-class-properties@0.0.7 (MIT license, (c) its authors).
// The npm package lists @babel/cli as a runtime dependency, which installed deprecated glob@7 / inflight into every
// xnode repository; this copy has the same behaviour without it (and uses Babel's built-in function naming instead of
// the frozen @babel/helper-function-name).
//
// A class with class properties is wrapped in a pure IIFE so an unused class can be removed by minifiers:
//   class A { static x = 1 }  →  const A = /*#__PURE__*/ (() => { class A { static x = 1 } return A; })();
const { declare } = require('@babel/helper-plugin-utils');
const annotateAsPure = require('@babel/helper-annotate-as-pure').default;

module.exports = declare(api => {
  api.assertVersion(7);
  const t = api.types;
  const seen = new WeakSet();

  return {
    name: 'no-side-effect-class-properties',
    visitor: {
      Class(path) {
        const { node } = path;
        if (seen.has(node)) return;
        seen.add(node);
        if (!path.get('body.body').some(member => member.isClassProperty())) return;

        const isExpression = path.isClassExpression();
        // An anonymous class declaration (`export default class {…}`) cannot become a const declaration.
        if (!isExpression && !node.id) return;
        let ref;
        if (isExpression) {
          // keep the inferred name (`const A = class {…}` → A.name === "A") once the class is wrapped
          if (typeof path.ensureFunctionName === 'function') path.ensureFunctionName(false);
          ref = path.scope.generateUidIdentifier('class');
        } else {
          ref = node.id;
        }

        const target = path.node; // ensureFunctionName may have replaced the node
        seen.add(target);
        const pureExpression = t.callExpression(
          t.arrowFunctionExpression([], isExpression ? target : t.blockStatement([target, t.returnStatement(t.cloneNode(ref))])),
          [],
        );
        annotateAsPure(pureExpression);
        path.replaceWith(
          isExpression ? pureExpression : t.variableDeclaration('const', [t.variableDeclarator(t.cloneNode(ref), pureExpression)]),
        );
      },
    },
  };
});
