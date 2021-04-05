import { registerNodeType } from "LiteGraph";

// Make node
function TestNode() {
  this.addInput("input", "*");
  this.addOutput("output", 0);
}

TestNode.prototype.onExecute = function () {
  let input = this.getInputData(0);
  this.setOutputData(0, input);
};

TestNode.title = "TestNode";
TestNode.description = "This is the example.";

// Expose Node
registerNodeType("test/TestNode", TestNode);
