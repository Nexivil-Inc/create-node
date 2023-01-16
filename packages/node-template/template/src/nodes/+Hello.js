import { Increase } from "../shared/utility";

export class HelloNode {
  static path = "my/folder";

  static title = "Hello-Node";
  static description = "This is my first node!";

  constructor() {
    // Output Slot
    this.addOutput("output", "string");
    this.addOutput("eventOutput", -1);

    // Node Properties
    this.properties = { count: 0 };

    // Node Widget
    this.widget = this.addWidget("button", "click", null, () => {
      // Add +1 to 'count' property
      this.properties.count = Increase(this.properties.count);
      // Trigger event out slot
      this.triggerSlot(0, `Hello~${this.properties.count}`);
    });
  }

  // Execute function when you Click Play button
  onExecute() {
    // set output slot data 'Hello'
    this.setOutputData(0, "Hello");
  }
}
