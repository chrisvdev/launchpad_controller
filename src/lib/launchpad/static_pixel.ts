import Pixel from "./pixel.js";
import {
  AxisCoordinate,
  Coordinate,
  SysexData,
  PalletCode,
} from "@launchpad/types.js";
import { getPosition } from "@launchpad/utils.js";

export default class StaticPixel implements Pixel {
  #x;
  #y;
  #code;
  constructor(x: AxisCoordinate, y: AxisCoordinate, code: PalletCode = 0) {
    this.#x = x;
    this.#y = y;
    this.#code = code;
  }
  getSysexMessage() {
    return [0, getPosition(this.#x, this.#y), this.#code] as SysexData;
  }
  getPosition() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}
