import Pixel from "./pixel.js";
import {
  AxisCoordinate,
  Coordinate,
  SysexData,
  PalletCode,
} from "@launchpad/types.js";
import { getPosition } from "@launchpad/utils.js";

export default class FlashingPixel implements Pixel {
  #x;
  #y;
  #code;
  #code2;
  constructor(
    x: AxisCoordinate,
    y: AxisCoordinate,
    code: PalletCode = 0,
    code2: PalletCode = 0
  ) {
    this.#x = x;
    this.#y = y;
    this.#code = code;
    this.#code2 = code2;
  }
  getSysexMessage() {
    return [
      1,
      getPosition(this.#x, this.#y),
      this.#code,
      this.#code2,
    ] as SysexData;
  }
  getPosition() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}
