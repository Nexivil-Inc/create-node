export class WorldNode {
  static path = "my/folder";

  static title = "World-Node";
  static description = "This is my second node!";

  constructor() {
    // Input Slot
    this.addInput("input", "string");
    this.addInput("eventInput", -1);

    // Output Slot
    this.addOutput("output", "string");
    this.addOutput("eventOutput", -1);
  }

  // Execute function when you Click Play button
  onExecute() {
    // Get data from Input Slot[1]
    const inputData = this.getInputData(0);
    // set output slot data 'hello World'
    this.setOutputData(0, `${inputData} World!`);
  }

  // Will Execute when the node received events
  onAction(action, parameters) {
    // Trigger event out slot
    this.triggerSlot(0, parameters);
  }
}
