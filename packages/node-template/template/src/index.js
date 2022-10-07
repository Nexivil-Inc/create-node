
import LiteGraph from "litegraph.js";

// This is the Fabrica™ Node Class Definition. 
export class FirstNode {
  static path = "my/folder";

  static title = "FirstNode";
  static description = "This is a my first node!";

  constructor() {
    this.addInput("input", "number");
    this.addInput("eventInput", LiteGraph.EVENT);

    this.addOutput("output", "number");
    this.addOutput("eventOutput", LiteGraph.EVENT);

    this.widget = this.addWidget("button", "click", null, function () {
      console.log("Hello, Design-Express!");
    });
  }

  onExecute() {
    const inputData = this.getInputData(0);
    this.setOutputData(0, inputData);
  }

  onAction(action, parameters) {
    this.triggerSlot(1, parameters);
  }
}
