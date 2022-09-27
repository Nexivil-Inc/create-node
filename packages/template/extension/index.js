/**
 * extension을 구성하는 class.
 * @type {JSX.ElementClass}
 * */
export class extension {
  /** @async */
  static async bootstrap() {
    throw new Error('Not Impl.');
  }

  /**
   * @return { import("React").FC<{enqueueMsg: Object}> } - Result of Return
   */
  static get UI() {
    throw new Error('Not Impl.');
  }

  /**
   * @return { import("React").FC<{enqueueMsg: Object}> } - Result of Return
   */
  static get Widget() {
    throw new Error('Not Impl.');
  }

  /** @type { string } - Extenstion Title */
  static get title() {
    throw new Error('Not Impl.');
  }

  static registerCommand() {
    throw new Error('Not Impl.');
  }
}
