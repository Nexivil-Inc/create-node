exports.generatedDate = function () {
  return new Date().toUTCString();
};

exports.outputSplit = function (name, options) {
  const data =
    /^(?<name>.[^\ ]*)\ +(?<desc>.*)$/.exec(String(name.description)).groups ||
    {};
  data.type = name.type;
  return options.fn(data);
};
// exports.litegraphRow = function () {
//   var args = arrayify(arguments);
//   var rows = args.shift();
//   if (!rows) return;
//   var options = args.pop();
//   var cols = args;
//   var output = "";

//   if (options.data) {
//     var data = handlebars.createFrame(options.data);
//     cols.forEach(function (col, index) {
//       var colNumber = index + 1;
//       data["col" + colNumber] = containsData(rows, col);
//     });
//   }
//   rows.forEach(function (row) {
//     output += options.fn(row, { data: data });
//   });
//   console.log(output)
//   return output;
// };
