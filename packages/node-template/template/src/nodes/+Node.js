import { Pure } from "@design-express/fabrica";

export class yourNode extends Pure {
  static path = "folder";
  static title = "NodeName";
  static description = "please describe your node";

  constructor() {
    super();
  }

  onExecute() {}
}
