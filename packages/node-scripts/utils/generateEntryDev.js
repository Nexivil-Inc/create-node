const { getFileImportList } = require('./getFiles');
const paths = require('../config/paths');

function generatorEntryDev() {
  const [importScript, mapper] = getFileImportList(paths.appSrc, 'nodes');
  return `
  import LiteGraph from "litegraph.js";
  ${importScript}
  
  const nodeSymbol= Symbol.for("fabrica.node");
    
    function _extendNodeClassGenerator(t){
      return class extendNodeClass extends t {
        constructor(){
          super(...arguments);
          this.$$develop = nodeSymbol;
        }
      }
    }

    ${Object.values(mapper)
      .map(
        k => `for (let key in ${k}) {
        let t = ${k}[key];          
        LiteGraph.registerNodeType(\`\${t.path ?? "testmodule"}/\${t.title ?? key}\`, _extendNodeClassGenerator(t));
      }`
      )
      .join('\n')}
    

    if (module.hot) {
      module.hot.accept(${JSON.stringify(Object.keys(mapper))},function(deps) {
        for (let dep of deps){
            switch (dep.replace("/src","")) {
                ${Object.entries(mapper)
                  .map(
                    ([k, v]) => `
                    case "${k}":
                        console.log("${k}")
                        for (let key in ${v}) {
                            let t = ${v}[key];          
                            LiteGraph.registerNodeType(\`\${t.path ?? "testmodule"}/\${t.title ?? key}\`, _extendNodeClassGenerator(t));
                        }
                        break;
                        `
                  )
                  .join('\n')}
                default:
                  break;
              }
        }
      },function (err, md) {
        console.log("EROROR");
      });

      module.hot.dispose((data) => {
        // 데이터를 정리하고 업데이트된 모듈로 전달합니다.
        console.log("removed: ",data)
      });
    }`;
}

module.exports = generatorEntryDev;
